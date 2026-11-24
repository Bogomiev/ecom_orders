import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductInfoSchema } from "../../../entities/product/model/info";
import { priceTagPeriod, ProductPriceTag, productTagView } from "./product-price-tag";

const product = ProductInfoSchema.parse({
  id: "p", code: "1", name: 'Икра <КЕТЫ> "Орланэко"', markingType: "БезОсобенностейУчета",
  isWeight: true, isThermalMode: false, barcodes: [{ barcode: "4601234567893", unit: "шт", ratio: 1, isBase: true }], price: 999.25, price_promo: 849.5,
  price_from: "2026-09-15T00:00:00", price_promo_from: "2026-09-28T00:00:00", price_promo_to: "2026-10-05T23:59:59",
  stock: 0, price_eshop: 0, price_ozon: 0, price_yandex_eats: 0,
  promo_price_eshop: 0, promo_price_ozon: 0, promo_price_yandex_eats: 0
});

describe("product price tag", () => {
  it("shows the printed 60×47 discount tag: promotional price with the regular one crossed out", () => {
    expect(productTagView(product)).toEqual({ name: product.name, unit: "кг", barcode: "", code: product.code, price: 849.5, old: 999.25, state: "promo" });
    expect(productTagView({ ...product, isWeight: false })).toMatchObject({ barcode: "4601234567893", code: "" });
    const html = renderToStaticMarkup(<ProductPriceTag product={product} />);
    expect(html).toContain('class="pt-wrap"');
    expect(html).toContain('<span class="pt-int">849</span>');
    expect(html).toContain('<span class="pt-cent">50</span>');
    expect(html).toContain("pt-old diag");
    expect(html).toContain("&lt;КЕТЫ&gt;");
    expect(html).toContain("с 28.09 по 05.10.2026");
    expect(html).not.toContain("Стоппер");
  });
  it("shows a regular tag per piece and its start date when the promotional price is zero", () => {
    expect(productTagView({ ...product, price_promo: 0, isWeight: false })).toMatchObject({ unit: "шт", price: 999.25, old: null, state: "regular" });
    const html = renderToStaticMarkup(<ProductPriceTag product={{ ...product, price_promo: 0, isWeight: false }} />);
    expect(html).toContain('<span class="pt-int">999</span>');
    expect(html).toContain("с 15.09.2026");
    expect(html).not.toContain('class="pt-old');
  });
  it("fills the space around the tag with the stopper color and shows its name", () => {
    const html = renderToStaticMarkup(<ProductPriceTag product={product} stopper={{ name: "ХИТ", color: "#D7261E" }} />);
    expect(html).toContain(">ХИТ</p>");
    expect(html).toContain("background-color:#D7261E");
    expect(html).not.toContain("Стоппер:");
  });
  it("preserves both years for promotions across New Year", () => {
    expect(priceTagPeriod({ ...product, price_promo_from: "2026-12-28", price_promo_to: "2027-01-05" })).toBe("с 28.12.2026 по 05.01.2027");
  });
});
