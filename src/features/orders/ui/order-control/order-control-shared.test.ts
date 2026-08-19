import { describe, expect, it } from "vitest";
import type { OrderItem } from "@/entities/order";
import { isOrderLineComplete } from "./order-control-shared";

const line: OrderItem = {
  product_id: "product",
  product_name: "Товар",
  marking_product: false,
  quantity: 10,
  price: 1,
  amount: 10,
  canceled: false,
  quantity_fact: 10,
  is_weight: false
};

describe("isOrderLineComplete", () => {
  it("требует точного количества для штучного товара", () => {
    expect(isOrderLineComplete({ ...line, quantity_fact: 9 })).toBe(false);
    expect(isOrderLineComplete(line)).toBe(true);
  });

  it("учитывает весовой товар в пределах отклонения ±20%", () => {
    expect(isOrderLineComplete({ ...line, is_weight: true, quantity_fact: 8 })).toBe(true);
    expect(isOrderLineComplete({ ...line, is_weight: true, quantity_fact: 12 })).toBe(true);
    expect(isOrderLineComplete({ ...line, is_weight: true, quantity_fact: 7.999 })).toBe(false);
    expect(isOrderLineComplete({ ...line, is_weight: true, quantity_fact: 12.001 })).toBe(false);
  });
});
