import { describe, expect, it } from "vitest";
import { addDays, stopperDays, stopperDaysLabel, promotedInStores, defaultWindow, filterPositions, formatShortDate, formatStopperPrice, periodState, positionGroup, positionID, sortPositions, stopperCounts, stopperNameError, stopperTextColor, type Stopper, type StopperPosition } from "./model";

const stoppers: Stopper[] = [{ id: 1, name: "Выгодно", color: "#F2B705", days: null, positions: 1 }, { id: 2, name: "ХИТ", color: "#D7261E", days: 28, positions: 1 }];
const position = (patch: Partial<StopperPosition>): StopperPosition => ({ doc_id: "doc", product_id: "p", code: "ЦБ-1", name: "Товар", thermal_mode: false, stopper_id: null, from: "2026-11-01", to: "2026-11-30", received: "2026-11-01", manual: false, stores: 1, prices: [], ...patch });

describe("stopper dates", () => {
 it("moves across months and builds a week window around today", () => {
  expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  expect(defaultWindow("2026-11-09")).toEqual({ from: "2026-11-02", to: "2026-11-16" });
  expect(formatShortDate("2026-11-09")).toBe("09.11");
  expect(formatShortDate("2025-07-21", "2026-11-09")).toBe("21.07.25");
 });
 it("marks planned, running and finished periods", () => {
  expect(periodState({ from: "2026-11-10", to: null }, "2026-11-09")).toBe("plan");
  expect(periodState({ from: "2026-11-01", to: "2026-11-08" }, "2026-11-09")).toBe("done");
  expect(periodState({ from: "2026-11-01", to: null }, "2026-11-09")).toBe("run");
 });
});
describe("stopper formatting", () => {
 it("formats prices in rubles", () => {
  expect(formatStopperPrice("1490.00").replace(/\s/g, " ")).toBe("1 490 ₽");
  expect(formatStopperPrice("89.50")).toBe("89,5 ₽");
  expect(formatStopperPrice(null)).toBe("—");
 });
 it("keeps stopper text readable", () => {
  expect(stopperTextColor("#F2B705")).toBe("#13232A");
  expect(stopperTextColor("#1F5FBF")).toBe("#FFFFFF");
 });
 it("reads the stopper duration: empty is an open period, otherwise 1 to 365 whole days", () => {
  expect(stopperDays("")).toBeNull();
  expect(stopperDays(" 28 ")).toBe(28);
  for (const bad of ["0", "366", "1.5", "-3", "две"]) expect(stopperDays(bad)).toBeUndefined();
  expect(stopperDaysLabel(14)).toBe("+14 дн.");
  expect(stopperDaysLabel(null)).toBe("без срока");
 });
 it("rejects empty and duplicate stopper names", () => {
  expect(stopperNameError(" ", stoppers, null)).toBe("Укажите наименование.");
  expect(stopperNameError("хит", stoppers, null)).toBe("Такой стоппер уже есть.");
  expect(stopperNameError("ХИТ", stoppers, 2)).toBe("");
 });
});
describe("stopper list", () => {
 const items = [
  position({ product_id: "a", name: "Икра", stopper_id: 2, thermal_mode: true }),
  position({ product_id: "b", name: "Кальмар", received: "2026-11-08", thermal_mode: true }),
  position({ doc_id: null, product_id: "c", code: "ЦБ-77", name: "Чай", stopper_id: 1, manual: true, to: null })
 ];
 it("counts tiles", () => {
  expect(stopperCounts(items, "2026-11-09")).toEqual({ nostop: 1, fresh: 1, stop: 2, all: 3, promo: 2, manual: 1 });
 });
 it("filters by tile and search", () => {
  expect(filterPositions(items, "nostop", "").map(v => v.product_id)).toEqual(["b"]);
  expect(filterPositions(items, "manual", "").map(v => v.product_id)).toEqual(["c"]);
  expect(filterPositions(items, "all", "цб-77").map(v => v.product_id)).toEqual(["c"]);
 });
 it("puts positions without a stopper first and groups by the chosen sort", () => {
  expect(sortPositions(items, "stopper", stoppers).map(v => v.product_id)).toEqual(["b", "c", "a"]);
  expect(sortPositions(items, "storage", stoppers).map(v => v.product_id)).toEqual(["b", "a", "c"]);
  expect(positionGroup(items[0], "storage")).toBe("true");
  expect(positionID(items[2])).toBe("manual:c");
 });
});
describe("stopper stores", () => {
 it("keeps promotions of the chosen stores and manual positions", () => {
  expect(promotedInStores(position({ prices: [{ store_id: "s", price: "100.00", promo_price: "80.00" }] }))).toBe(true);
  expect(promotedInStores(position({ prices: [{ store_id: "s", price: "100.00", promo_price: null }, { store_id: "t", price: null, promo_price: null }] }))).toBe(false);
  expect(promotedInStores(position({ manual: true, doc_id: null, prices: [{ store_id: "s", price: "100.00", promo_price: null }] }))).toBe(true);
 });
});
