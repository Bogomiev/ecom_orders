import { describe, expect, it } from "vitest";
import { formatStock, stopperTaskDone, stopperTaskLeft, formatTaskStart, groupStopperTaskItems, paginate, sheetsLabel, shortCode, stopperTaskCounts, stopperTaskItemID, visibleStopperTaskItems, type StopperTaskItem } from "./stopper-task";

const item = (patch: Partial<StopperTaskItem>): StopperTaskItem => ({ doc_id: "doc", product_id: "p", code: "ЦБ-1", name: "Товар", thermal_mode: true, unit: "шт", stopper: "ХИТ", stopper_color: "#D7261E", from: "2026-11-01", to: null, remove: false, stock: "3", price: "1490.00", promo_price: "1190.00", barcode: "4607003760342", result: "", ...patch });
const items = [
 item({ product_id: "a", name: "Икра", result: "ok" }),
 item({ product_id: "b", name: "Кальмар", result: "bad" }),
 item({ product_id: "c", name: "Шпроты", thermal_mode: false, stock: "0" }),
 item({ product_id: "d", name: "Чай", thermal_mode: false, doc_id: null }),
 item({ product_id: "e", name: "Скумбрия", remove: true, to: "2026-11-05", stock: null }),
 item({ product_id: "f", name: "Мидии", thermal_mode: false, remove: true, to: "2026-11-08", result: "removed" })
];

describe("stopper task list", () => {
 it("counts stoppers to check in stock and stoppers to remove", () => {
  expect(stopperTaskCounts(items, false)).toEqual({ inStock: 3, total: 4, base: 3, done: 2, ok: 1, bad: 1, remove: 2, removeLeft: 1 });
  expect(stopperTaskCounts(items, true).base).toBe(4);
 });
 it("filters by stock, search and status", () => {
  const ids = (v: { check: StopperTaskItem[]; remove: StopperTaskItem[] }) => [...v.check, ...v.remove].map(x => x.product_id);
  expect(ids(visibleStopperTaskItems(items, { all: false, query: "", filter: "all" }))).toEqual(["a", "b", "d", "e", "f"]);
  expect(ids(visibleStopperTaskItems(items, { all: true, query: "", filter: "todo" }))).toEqual(["c", "d", "e"]);
  expect(ids(visibleStopperTaskItems(items, { all: false, query: "", filter: "bad" }))).toEqual(["b"]);
  expect(ids(visibleStopperTaskItems(items, { all: false, query: "", filter: "rm" }))).toEqual(["e", "f"]);
  expect(ids(visibleStopperTaskItems(items, { all: false, query: "кальм", filter: "all" }))).toEqual(["b"]);
 });
 it("groups thermal goods first, then the shelf", () => {
  const { check, remove } = visibleStopperTaskItems(items, { all: true, query: "", filter: "all" });
  expect(groupStopperTaskItems(check, remove).map(g => [g.thermal, g.remove.map(v => v.product_id), g.check.map(v => v.product_id)])).toEqual([
   [true, ["e"], ["a", "b"]], [false, ["f"], ["d", "c"]]
  ]);
 });
});
describe("stopper task formatting", () => {
 it("names a product on the sheet by the last 5 digits of its code", () => {
  expect(shortCode("ЦБ-00000988")).toBe("00988");
  expect(shortCode("12")).toBe("12");
 });
 it("formats stock, start and position keys", () => {
  expect(formatStock({ stock: "2.500", unit: "кг" })).toBe("2,5 кг");
  expect(formatStock({ stock: null, unit: "шт" })).toBe("нет");
  expect(formatTaskStart("2026-11-09T08:00:00")).toBe("09.11 в 08:00");
  expect(stopperTaskItemID({ doc_id: null, product_id: "x" })).toBe("manual:x");
 });
 it("splits print rows into A4 sheets", () => {
  expect(paginate(Array.from({ length: 35 }, (_, i) => i), 34).map(p => p.length)).toEqual([34, 1]);
  expect(paginate([])).toEqual([[]]);
  expect([1, 2, 5, 11, 22].map(sheetsLabel)).toEqual(["1 лист", "2 листа", "5 листов", "11 листов", "22 листа"]);
 });
});
describe("stopper task completion", () => {
 it("is done when products in stock match and ended stoppers are removed", () => {
  expect(stopperTaskDone([item({ result: "ok" }), item({ product_id: "x", stock: "0" }), item({ product_id: "y", remove: true, result: "removed" })])).toBe(true);
  expect(stopperTaskDone([item({ result: "bad" })])).toBe(false);
  expect(stopperTaskDone([item({ result: "" })])).toBe(false);
  expect(stopperTaskDone([item({ remove: true, result: "" })])).toBe(false);
  // Left: unchecked or sent-to-print products in stock and ended stoppers not removed; no stock does not count.
  expect(stopperTaskLeft([item({ result: "ok" }), item({ product_id: "a", result: "bad" }), item({ product_id: "b" }), item({ product_id: "c", stock: "0" }), item({ product_id: "d", remove: true }), item({ product_id: "e", remove: true, result: "removed" })])).toBe(3);
 });
 it("finds a product by barcode", () => {
  expect(visibleStopperTaskItems(items, { all: true, query: "46070037", filter: "all" }).check.length).toBe(4);
  expect(visibleStopperTaskItems(items, { all: true, query: "999", filter: "all" }).check.length).toBe(0);
 });
});
