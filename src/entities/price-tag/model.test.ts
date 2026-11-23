import { describe, expect, it } from "vitest";
import { formatMoment, priceTagProductStatus, stopperTextColor, type PriceTagProductState } from "./model";

const state = (v: Partial<PriceTagProductState>): PriceTagProductState => ({ task_id: null, item_id: null, pending: false, source: null, quantity: 0, actual_at: null, last_printed_at: null, stopper: null, ...v });

describe("price tag of the product card", () => {
 it("offers to show the task while the tag waits in it, and says nothing else", () => {
  expect(priceTagProductStatus(state({ task_id: 3, item_id: 9, pending: true, source: "revaluation", quantity: 2, last_printed_at: "2026-11-10T12:05:00" })))
   .toEqual({ queued: true, action: "Показать задание на печать ценника", printed: "" });
 });
 it("offers to put a printed or never printed product into the task", () => {
  expect(priceTagProductStatus(state({ task_id: 3, item_id: 9, pending: false, source: "manual", quantity: 1, last_printed_at: "2026-11-10T12:05:00" })))
   .toEqual({ queued: false, action: "Сформировать задание на печать ценника", printed: "Последняя печать 10.11.2026 12:05" });
  expect(priceTagProductStatus(state({})).printed).toBe("Ценник ещё не печатался");
 });
 it("formats moments", () => {
  expect(formatMoment("2026-01-02T03:04:05")).toBe("02.01.2026 03:04");
  expect(formatMoment(null)).toBe("");
 });
});

describe("stopper colors", () => {
 it("writes dark on light stoppers and white on dark ones", () => {
  expect(stopperTextColor("#F2B705")).toBe("#141414");
  expect(stopperTextColor("#C2185B")).toBe("#ffffff");
  expect(stopperTextColor("#D7261E")).toBe("#ffffff");
  expect(stopperTextColor("bad")).toBe("#ffffff");
 });
});
