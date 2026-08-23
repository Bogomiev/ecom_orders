import { describe, expect, it } from "vitest";
import type { Order } from "@/entities/order";
import { getCompleteOrderItems } from "./complete-order-items";

const order: Order = {
  id: "order-1",
  uid_1c: "uid-order-1",
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
  order_sum: 100,
  comment: "",
  shipment_store_name: "Магазин",
  store_id: "store-1",
  quantityBags: 1,
  controlledItems: [],
  items: [{
    product_id: "product-1",
    product_name: "Икра",
    marking_product: false,
    quantity: 2,
    price: 50,
    amount: 100,
    canceled: false,
    quantity_fact: 1,
    is_weight: false
  }]
};

describe("getCompleteOrderItems", () => {
  it("добавляет в запрос обычную собранную строку", () => {
    expect(getCompleteOrderItems(order)).toEqual([{
      product_id: "product-1",
      product_name: "Икра",
      quantity: 1,
      mark: ""
    }]);
  });

  it("использует отсканированные марки для маркируемого товара", () => {
    const markedOrder: Order = {
      ...order,
      controlledItems: [{
        product_id: "product-1",
        product_name: "Икра",
        quantity: 1,
        mark: "0104601234567890ABC",
        result: true
      }],
      items: [{ ...order.items[0], marking_product: true }]
    };

    expect(getCompleteOrderItems(markedOrder)).toEqual([{
      product_id: "product-1",
      product_name: "Икра",
      quantity: 1,
      mark: "0104601234567890ABC"
    }]);
  });

  it("не добавляет несобранные строки", () => {
    expect(getCompleteOrderItems({
      ...order,
      items: [{ ...order.items[0], quantity_fact: 0 }]
    })).toEqual([]);
  });

  it("не добавляет отменённые строки", () => {
    expect(getCompleteOrderItems({
      ...order,
      items: [{ ...order.items[0], canceled: true }]
    })).toEqual([]);
  });
});
