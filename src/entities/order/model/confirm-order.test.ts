import { describe, expect, it } from "vitest";
import {
  ConfirmOrderItemAction,
  ConfirmOrderRequestSchema
} from "./schema";

describe("ConfirmOrderRequestSchema", () => {
  it("accepts an action for every order item", () => {
    const request = {
      orderId: "order-1",
      seller: "seller-1",
      items: [
        { product_id: "product-1", quantity: 1.25, action: ConfirmOrderItemAction.CONFIRMED },
        { product_id: "product-2", quantity: 3, action: ConfirmOrderItemAction.CANCELLED }
      ]
    };

    expect(ConfirmOrderRequestSchema.parse(request)).toEqual(request);
  });

  it.each([-1, Infinity, NaN])("rejects invalid quantity %s", (quantity) => {
    expect(() => ConfirmOrderRequestSchema.parse({
      orderId: "order-1",
      seller: "seller-1",
      items: [{ product_id: "product-1", quantity, action: ConfirmOrderItemAction.CONFIRMED }]
    })).toThrow();
  });

  it("rejects an unsupported item action", () => {
    expect(() => ConfirmOrderRequestSchema.parse({
      orderId: "order-1",
      seller: "seller-1",
      items: [{ product_id: "product-1", action: "DELETED" }]
    })).toThrow();
  });
});
