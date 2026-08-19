import { describe, expect, it } from "vitest";
import type { Order } from "@/entities/order";
import {
  enrichOrder,
  getMissingOrderProductIds
} from "./order-products";

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
  order_sum: 1,
  comment: "",
  shipment_store_name: "Магазин",
  store_id: "store",
  quantityBags: 0,
  controlledItems: [],
  items: [{
    product_id: "product",
    product_name: "",
    marking_product: false,
    quantity: 1,
    price: 1,
    amount: 1,
    canceled: false,
    quantity_fact: 0,
    is_weight: false
  }]
} satisfies Order;

const product = {
  uid: "product",
  code: "1",
  name: "Икра",
  markingType: "Маркируемый",
  isWeight: true,
  barcodes: []
};

describe("order products", () => {
  it("находит отсутствующие в справочнике товары заказа", () => {
    expect(getMissingOrderProductIds(order, [])).toEqual(["product"]);
    expect(getMissingOrderProductIds(order, [product])).toEqual([]);
  });

  it("обогащает товар данными актуального справочника", () => {
    expect(enrichOrder(order, [product]).items[0]).toMatchObject({
      product_name: "Икра",
      marking_product: true,
      is_weight: true
    });
  });
});
