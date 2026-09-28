import { describe, expect, it } from "vitest";
import { formatReceiptDate, ProductInfoResponseSchema } from "./info";

const product = {
  id: "product-id", code: "123", name: "$$$Камбала вяленая",
  markingType: "БезОсобенностейУчета", isWeight: true, isThermalMode: false,
  barcodes: [], price: 215, stock: 3,
  price_eshop: 0, price_ozon: 0, price_yandex_eats: 0,
  promo_price_eshop: 0, promo_price_ozon: 0, promo_price_yandex_eats: 0
};
function parse(images: unknown) {
  return ProductInfoResponseSchema.parse({ resultCode: 0, messages: [], data: [{ ...product, images }] }).data[0];
}

describe("product images from RMS", () => {
  it("reads URLs from image objects without rejecting the product", () => {
    const result = parse([{ url: "https://images.test/fish.jpg", id: "photo", name: "Рыба" }]);
    expect(result.images).toEqual(["https://images.test/fish.jpg"]);
    expect(result.name).toBe(product.name);
    expect(result.price).toBe(215);
  });
  it("also accepts plain image URLs", () => {
    expect(parse(["https://images.test/fish.jpg"]).images).toEqual(["https://images.test/fish.jpg"]);
  });
  it("keeps the card available for unknown image metadata and preserves the first image position", () => {
    expect(parse([{ id: "unknown" }, { url: "https://images.test/second.jpg" }]).images).toEqual([null, "https://images.test/second.jpg"]);
  });
  it.each([null, undefined, []])("accepts missing photos: %j", (images) => {
    expect(parse(images).images).toEqual([]);
  });
});

describe("product receipts", () => {
  it.each([undefined, null, []])("accepts absent receipts: %j", (receipts) => {
    const response = ProductInfoResponseSchema.parse({ resultCode: 0, data: [{ ...product, receipts }] });
    expect(response.data[0].receipts).toEqual([]);
    expect(response.receipts).toEqual([]);
  });
  it("preserves receipt fields in the product and response", () => {
    const receipts = [{ type: "Перемещение", date: "2025-11-20T09:41:56", number: "ИКЦБ-025735", supplier: "101_Сочи_РЦ", store_id: "store", product_id: product.id }];
    const response = ProductInfoResponseSchema.parse({ resultCode: 0, receipts, data: [{ ...product, receipts }] });
    expect(response.data[0].receipts).toEqual(receipts);
    expect(response.receipts).toEqual(receipts);
  });
  it.each([
    ["2025-11-20T09:41:56", "20.11.2025"],
    ["2026-01-01T00:00:00+10:00", "01.01.2026"],
    ["2025-12-27T12:39:59", "27.12.2025"],
    ["", "—"]
  ])("formats document date %s as %s", (input, expected) => {
    expect(formatReceiptDate(input)).toBe(expected);
  });
});
