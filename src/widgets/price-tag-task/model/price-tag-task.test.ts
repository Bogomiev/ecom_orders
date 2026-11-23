import { describe, expect, it } from "vitest";
import { unitPrice, byPrintStatus, expandTags, formatMoment, priceParts, printable, sheets, summary, tagPeriod, tagView, type PriceTagItem } from "./price-tag-task";

const item = (patch: Partial<PriceTagItem>): PriceTagItem => ({
 id: 1, product_id: "p", source: "revaluation", doc_id: null, tag_type: "regular", quantity: 1, pending: true, actual_at: "2026-11-10T00:00:00", printed_at: null, last_printed_at: null, unit: "pc",
 code: "001", name: "Хлеб", is_weight: false, barcode: "4601234567893",
 price: "120.00", price_from: "2026-11-10", promo_price: null, promo_from: null, promo_to: null, ...patch
});

describe("price tag task", () => {
 it("prints a regular tag with a price and a promotional tag only while the promotion runs", () => {
  expect(printable(item({}))).toBe(true);
  expect(printable(item({ price: null }))).toBe(false);
  expect(printable(item({ tag_type: "promo" }))).toBe(false);
  expect(printable(item({ tag_type: "promo", promo_price: "99.90" }))).toBe(true);
  expect(printable(item({ tag_type: "card" }))).toBe(false);
  expect(printable(item({ tag_type: "card", promo_price: "99.90" }))).toBe(true);
 });
 it("shows the promotional price with the regular one above it only for a discount or a card tag", () => {
  expect(tagView(item({ promo_price: "99.90", is_weight: true, unit: "kg" }))).toEqual({ name: "Хлеб", unit: "кг", barcode: "4601234567893", price: 120, old: null, state: "regular" });
  expect(tagView(item({ tag_type: "promo", promo_price: "99.90" }))).toMatchObject({ price: 99.9, old: 120, state: "promo", unit: "шт" });
  expect(tagView(item({ tag_type: "card", promo_price: "99.90" }))).toMatchObject({ price: 99.9, old: 120, state: "card" });
 });
 it("splits rubles by thousands and keeps kopecks", () => {
  expect(priceParts(11550)).toEqual(["11\u00a0550", "00"]);
  expect(priceParts(99.9)).toEqual(["99", "90"]);
  expect(priceParts(1234567.5)).toEqual(["1\u00a0234\u00a0567", "50"]);
 });
 it("describes the period of the price", () => {
  expect(tagPeriod(item({}))).toBe("с 10.11.2026");
  expect(tagPeriod(item({ tag_type: "promo", promo_price: "99.90", promo_from: "2026-11-10", promo_to: "2026-11-30" }))).toBe("с 10.11 по 30.11.2026");
  expect(tagPeriod(item({ tag_type: "promo", promo_price: "99.90", promo_from: "2026-12-28", promo_to: "2027-01-05" }))).toBe("с 28.12.2026 по 05.01.2027");
  expect(tagPeriod(item({ tag_type: "promo", promo_price: "99.90", promo_from: "2026-11-10" }))).toBe("с 10.11.2026");
  expect(tagPeriod(item({ tag_type: "card", promo_price: "99.90", promo_from: "2026-11-10", promo_to: "2026-11-30" }))).toBe("с 10.11 по 30.11.2026");
 });
 it("counts selected tags and printed positions", () => {
  const items = [item({ id: 1, quantity: 2 }), item({ id: 2, quantity: 3, pending: false, printed_at: "2026-11-10T10:00:00" }), item({ id: 3 })];
  expect(summary(items, new Set([1, 2]))).toEqual({ selected: 2, total: 3, tags: 5, printed: 1 });
  expect(byPrintStatus(items, "pending").map(v => v.id)).toEqual([1, 3]);
  expect(byPrintStatus(items, "printed").map(v => v.id)).toEqual([2]);
  expect(byPrintStatus(items, "all")).toHaveLength(3);
  expect(formatMoment("2026-11-10T09:05:00")).toBe("10.11.2026 09:05");
  expect(formatMoment(null)).toBe("");
 });
 it("repeats a position by its quantity and puts 18 tags on a sheet", () => {
  const tags = expandTags([item({ id: 1, quantity: 4 }), item({ id: 2, quantity: 3 }), item({ id: 3, price: null, quantity: 5 })]);
  expect(tags.map(v => v.key)).toEqual(["1-0", "1-1", "1-2", "1-3", "2-0", "2-1", "2-2"]);
  expect(sheets(expandTags([item({ id: 1, quantity: 19 })])).map(v => v.length)).toEqual([18, 1]);
 });
});

describe("price tag units", () => {
 it("prices weighed goods per 1 кг or 100 г", () => {
  expect(unitPrice(1290, "100g")).toBe(129);
  expect(unitPrice(845.5, "100g")).toBe(84.55);
  expect(unitPrice(1290, "kg")).toBe(1290);
  const weighed = item({ is_weight: true, unit: "100g", price: "1290", promo_price: "990", tag_type: "promo" });
  expect(tagView(weighed)).toMatchObject({ unit: "100 г", price: 99, old: 129, state: "promo" });
  expect(tagView({ ...weighed, unit: "kg" })).toMatchObject({ unit: "кг", price: 990, old: 1290 });
  expect(tagView(item({ unit: "pc" })).unit).toBe("шт");
 });
});
