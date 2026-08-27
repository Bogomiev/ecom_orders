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
        { product_id: "product-1", action: ConfirmOrderItemAction.CONFIRMED },
        { product_id: "product-2", action: ConfirmOrderItemAction.CANCELLED }
      ]
    };

    expect(ConfirmOrderRequestSchema.parse(request)).toEqual(request);
  });

  it("rejects an unsupported item action", () => {
    expect(() => ConfirmOrderRequestSchema.parse({
      orderId: "order-1",
      seller: "seller-1",
      items: [{ product_id: "product-1", action: "DELETED" }]
    })).toThrow();
  });
});
