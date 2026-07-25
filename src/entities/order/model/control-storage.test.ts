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
  status: "Новый",
  extended_status: "",
  order_created_at: "",
  confirmation_date: "",
  delivery_date: "",
  delivery_time: "",
  order_sum: 10,
  shipment_store_name: "Магазин",
  store_id: "store",
  items: [{
    product_id: "product",
    product_name: "Товар",
    marking_product: false,
    quantity: 2,
    quantity_fact: 1,
    price: 5,
    amount: 10,
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

    expect(restoreOrderControl(emptyOrder).items[0].quantity_fact).toBe(1);
    clearStoredOrderControl(order);
    expect(restoreOrderControl(emptyOrder).items[0].quantity_fact).toBe(0);
  });
});
