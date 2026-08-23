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
        external_id: "EXT-10",
        source: "Сайт",
        deliveryMethod: "pickup",
        status: "Новый",
        extended_status: "",
        order_created_at: "",
        confirmation_date: "",
        delivery_date: "",
        delivery_time: "10:00",
        delivery_time_by: "12:00",
        address: "ул. Примерная, 1",
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
          canceled: true,
          quantity_fact: null
        }]
      }]
    });

    const result = normalizeOneCOrders(source);
    expect(result.items[0].quantityBags).toBe(0);
    expect(result.items[0].external_id).toBe("EXT-10");
    expect(result.items[0].deliveryMethod).toBe("pickup");
    expect(result.items[0].delivery_time).toBe("10:00");
    expect(result.items[0].delivery_time_by).toBe("12:00");
    expect(result.items[0].address).toBe("ул. Примерная, 1");
    expect(result.items[0].controlledItems).toEqual([]);
    expect(result.items[0].items[0]).toMatchObject({
      product_name: "product",
      marking_product: false,
      canceled: true,
      quantity_fact: 0,
      is_weight: false
    });
  });
});
