import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductInfoSchema } from "../../../entities/product/model/info";
import { priceTagPeriod, ProductPriceTag } from "./product-price-tag";

const product = ProductInfoSchema.parse({
  id: "p", code: "1", name: 'Икра <КЕТЫ> "Орланэко"', markingType: "БезОсобенностейУчета",
  isWeight: true, isThermalMode: false, barcodes: [], price: 999.25, price_promo: 849.5,
  price_from: "2026-09-15T00:00:00", price_promo_from: "2026-09-28T00:00:00", price_promo_to: "2026-10-05T23:59:59",
  stock: 0, price_eshop: 0, price_ozon: 0, price_yandex_eats: 0,
  promo_price_eshop: 0, promo_price_ozon: 0, promo_price_yandex_eats: 0
});

describe("product price tag", () => {
  it("renders the promotional price and crossed out regular price with exact kopecks", () => {
    const html = renderToStaticMarkup(<ProductPriceTag product={product} />);
    expect(html).toContain("СКИДКА");
    expect(html).toContain("849,50");
    expect(html).toContain(">999</text>");
    expect(html).toContain(">25</text>");
    expect(html).toContain("с 28.09 по 05.10.2026");
    expect(html).toContain("&lt;КЕТЫ&gt;");
    expect(html).not.toContain("Есть задание");
  });
  it("renders a regular tag and its start date when the promotional price is zero", () => {
    const html = renderToStaticMarkup(<ProductPriceTag product={{ ...product, price_promo: 0, isWeight: false }} />);
    expect(html).toContain("РЕГУЛЯРНАЯ ЦЕНА");
    expect(html).toContain("999,25");
    expect(html).toContain("с 15.09.2026");
    expect(html).toContain(">ШТ</text>");
    expect(html).not.toContain("СКИДКА");
  });
  it("preserves both years for promotions across New Year", () => {
    expect(priceTagPeriod({ ...product, price_promo_from: "2026-12-28", price_promo_to: "2027-01-05" })).toBe("с 28.12.2026 по 05.01.2027");
  });
});
