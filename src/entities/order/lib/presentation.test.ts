import { describe, expect, it } from "vitest";
import type { Order } from "../model/types";
import {
  getOrderStatusLabel,
  getOrderTone,
  isOrderAwaitingConfirmation
} from "./presentation";

const order = {
  id: "order",
  uid_1c: "uid",
  number: "1",
  source: "Сайт",
  status: "Новый",
  extended_status: "",
  order_created_at: "",
  confirmation_date: "",
  delivery_date: "",
  delivery_time: "",
  order_sum: 0,
  shipment_store_name: "Магазин",
  store_id: "store",
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

describe("getOrderTone", () => {
  it("показывает подтвержденный заказ, ожидающий сборку, как заказ в сборке", () => {
    const tone = getOrderTone({
      ...order,
      status: "Подтвержден",
      extended_status: "Ожидает сборку"
    });

    expect(tone).toBe("yellow");
    expect(getOrderStatusLabel(tone)).toBe("В сборке");
  });

  it("оставляет ожидающий подтверждения заказ новым", () => {
    const tone = getOrderTone({
      ...order,
      extended_status: "Ожидает подтверждения"
    });

    expect(tone).toBe("blue");
    expect(getOrderStatusLabel(tone)).toBe("Новый");
  });
});
