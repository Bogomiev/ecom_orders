import { describe, expect, it } from "vitest";
import { normalizeOneCOrders, OneCOrdersResponseSchema } from "./one-c-order";

describe("normalizeOneCOrders", () => {
  it("добавляет внутренние поля и нормализует null", () => {
    const source = OneCOrdersResponseSchema.parse({
      page: 1,
      perPage: 20,
      totalPages: 1,
      totalItems: 1,
      items: [{
        id: "1",
        uid_1c: "uid",
        number: "10",
        source: "Сайт",
        status: "Новый",
        extended_status: "",
        order_created_at: "",
        confirmation_date: "",
        delivery_date: "",
        delivery_time: "",
        order_sum: 100,
        comment: "Комментарий: Позвонить перед доставкой",
        shipment_store_name: "Магазин",
        store_id: "store",
        controlledItems: null,
        items: [{
          product_id: "product",
          quantity: 1,
          price: 100,
          amount: 100,
          quantity_fact: null
        }]
      }]
    });

    const result = normalizeOneCOrders(source);
    expect(result.items[0].quantityBags).toBe(0);
    expect(result.items[0].controlledItems).toEqual([]);
    expect(result.items[0].items[0]).toMatchObject({
      product_name: "product",
      marking_product: false,
      quantity_fact: 0,
      is_weight: false
    });
  });
});
