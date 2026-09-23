import { describe, expect, it } from "vitest";
import { GoodsReceiptsResponseSchema } from "./schema";

describe("1C goods receipts", () => {
  it("accepts acquisitions with tax-inclusive amounts and zero-price transfers", () => {
    const common = { id: "document", number: "ИКЦБ-000032", created_at: "2026-09-22T15:01:25", sender: "Отправитель", shipment_store_name: "Торговая точка", comment: "" };
    const response = GoodsReceiptsResponseSchema.parse({
      page: 1, perPage: 2, totalPages: 1, totalItems: 2,
      items: [
        { ...common, type: "RECEIPT", amount: 1226.1, items: [{ product_id: "product", quantity: 1, price: 1005, amount: 1226.1 }] },
        { ...common, id: "transfer", type: "TRANSFER", amount: 0, items: [{ product_id: "product", quantity: 10, price: 0, amount: 0 }] }
      ]
    });
    expect(response.items[0].items[0].amount).toBe(1226.1);
    expect(response.items[1].items[0].price).toBe(0);
  });
});
