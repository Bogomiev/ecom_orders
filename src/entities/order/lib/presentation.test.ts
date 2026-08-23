import { describe, expect, it } from "vitest";
import type { Order } from "../model/types";
import {
  formatOrderTime,
  getOrderPickBefore,
  getOrderStatusLabel,
  getOrderTone,
  isOrderAwaitingAssembly,
  isOrderAwaitingConfirmation,
  isOrderReady,
  isOrderRequiringAttention,
  isOrderUnavailableForOpening
} from "./presentation";

const order = {
  id: "order",
  uid_1c: "uid",
  number: "1",
  source: "Сайт",
  deliveryMethod: "pickup",
  status: "Новый",
  extended_status: "",
  order_created_at: "",
  confirmation_date: "",
  delivery_date: "",
  delivery_time: "",
  delivery_time_by: "",
  address: "",
  order_sum: 0,
  comment: "",
  shipment_store_name: "Магазин",
  store_id: "store",
  quantityBags: 0,
  items: [],
  controlledItems: []
} satisfies Order;

describe("isOrderAwaitingConfirmation", () => {
  it("определяет подтверждение по расширенному статусу", () => {
    expect(isOrderAwaitingConfirmation({
      ...order,
      extended_status: "Ожидает подтверждения"
    })).toBe(true);
  });

  it("не зависит от регистра и пробелов в расширенном статусе", () => {
    expect(isOrderAwaitingConfirmation({
      ...order,
      extended_status: "  ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ  "
    })).toBe(true);
  });

  it("не использует обычное поле status", () => {
    expect(isOrderAwaitingConfirmation({
      ...order,
      status: "Ожидает подтверждения",
      extended_status: ""
    })).toBe(false);
  });

  it("не считает другой расширенный статус ожидающим подтверждения", () => {
    expect(isOrderAwaitingConfirmation(order)).toBe(false);
  });
});

describe("getOrderPickBefore", () => {
  it("добавляет 10 минут ко времени создания для ожидающего подтверждения заказа", () => {
    expect(getOrderPickBefore({
      ...order,
      extended_status: "Ожидает подтверждения",
      order_created_at: "2026-08-23T10:00:00+03:00",
      confirmation_date: "2026-08-23T12:00:00+03:00"
    })).toBe(formatOrderTime("2026-08-23T10:10:00"));
  });

  it("добавляет 10 минут ко времени подтверждения для остальных заказов", () => {
    expect(getOrderPickBefore({
      ...order,
      extended_status: "Ожидает сборку",
      order_created_at: "2026-08-23T10:00:00+03:00",
      confirmation_date: "2026-08-23T12:00:00+03:00"
    })).toBe(formatOrderTime("2026-08-23T12:10:00"));
  });

  it("считает время из 1С московским независимо от суффикса", () => {
    expect(getOrderPickBefore({
      ...order,
      extended_status: "Ожидает сборку",
      confirmation_date: "2026-08-23T12:02:36+03:00"
    })).toBe(formatOrderTime("2026-08-23T12:12:36"));
  });
});

describe("isOrderRequiringAttention", () => {
  it.each(["Ожидает подтверждения", "Ожидает сборку"])(
    "считает заказ со статусом %s требующим внимания",
    (extendedStatus) => {
      expect(isOrderRequiringAttention({ ...order, extended_status: extendedStatus })).toBe(true);
    }
  );

  it("не считает заказ с другим статусом требующим внимания", () => {
    expect(isOrderRequiringAttention({ ...order, extended_status: "Готов" })).toBe(false);
  });

  it("определяет ожидание сборки независимо от регистра и пробелов", () => {
    expect(isOrderAwaitingAssembly({
      ...order,
      extended_status: "  ОЖИДАЕТ СБОРКУ "
    })).toBe(true);
  });
});

describe("getOrderTone", () => {
  it("показывает подтвержденный заказ, ожидающий сборку, как заказ в сборке", () => {
    const tone = getOrderTone({
      ...order,
      status: "Подтвержден",
      extended_status: "Ожидает сборку"
    });

    expect(tone).toBe("yellow");
    expect(getOrderStatusLabel({
      ...order,
      status: "Подтвержден",
      extended_status: "Ожидает сборку"
    })).toBe("В сборке");
  });

  it("оставляет ожидающий подтверждения заказ новым", () => {
    const tone = getOrderTone({
      ...order,
      extended_status: "Ожидает подтверждения"
    });

    expect(tone).toBe("blue");
    expect(getOrderStatusLabel({
      ...order,
      extended_status: "Ожидает подтверждения"
    })).toBe("Новый");
  });
});

describe("новые расширенные статусы", () => {
  it("определяет готовый заказ независимо от регистра и пробелов", () => {
    expect(isOrderReady({
      ...order,
      extended_status: "  ГОТОВ "
    })).toBe(true);
  });

  it("не разрешает открывать отмененный заказ", () => {
    const unavailableOrder = { ...order, extended_status: "Отменен" };
    expect(isOrderUnavailableForOpening(unavailableOrder)).toBe(true);
    expect(getOrderStatusLabel(unavailableOrder)).toBe("Отменен");
  });

  it("разрешает открывать заказ, переданный курьеру", () => {
    const courierOrder = { ...order, extended_status: "Передан курьеру" };
    expect(isOrderUnavailableForOpening(courierOrder)).toBe(false);
    expect(getOrderStatusLabel(courierOrder)).toBe("Передан курьеру");
  });
});
