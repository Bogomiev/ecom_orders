import { beforeEach, describe, expect, it } from "vitest";
import type { Order } from "./types";
import {
  clearStoredOrderControl,
  restoreOrderControl,
  saveOrderControl
} from "./control-storage";

const order: Order = {
  id: "order",
  uid_1c: "order-uid",
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
  order_sum: 10,
  comment: "",
  shipment_store_name: "Магазин",
  store_id: "store",
  quantityBags: 3,
  items: [{
    product_id: "product",
    product_name: "Товар",
    marking_product: false,
    quantity: 2,
    quantity_fact: 1,
    price: 5,
    amount: 10,
    canceled: false,
    is_weight: false
  }],
  controlledItems: []
};

const values = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    }
  }
});

describe("order control storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("сохраняет, восстанавливает и очищает прогресс", () => {
    saveOrderControl(order);
    const emptyOrder = {
      ...order,
      items: [{ ...order.items[0], quantity_fact: 0 }]
    };

    const restoredOrder = restoreOrderControl({
      ...emptyOrder,
      quantityBags: 0
    });
    expect(restoredOrder.items[0].quantity_fact).toBe(1);
    expect(restoredOrder.quantityBags).toBe(3);
    clearStoredOrderControl(order);
    const clearedOrder = restoreOrderControl({
      ...emptyOrder,
      quantityBags: 0
    });
    expect(clearedOrder.items[0].quantity_fact).toBe(0);
    expect(clearedOrder.quantityBags).toBe(0);
  });

  it("удаляет сохраненное количество после обнуления строки", () => {
    saveOrderControl(order);

    const emptyOrder = {
      ...order,
      items: [{ ...order.items[0], quantity_fact: 0 }]
    };
    saveOrderControl(emptyOrder);

    const restoredOrder = restoreOrderControl(emptyOrder);
    expect(restoredOrder.items[0].quantity_fact).toBe(0);
  });
});
