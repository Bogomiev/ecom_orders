import { describe, expect, it } from "vitest";
import { describeDays, resizeDays, weekBoundary } from "./scheduling";

describe("task scheduling calendar", () => {
 it("expands dates to whole weeks across month and year boundaries", () => {
  expect(weekBoundary("2027-01-01", false)).toBe("2026-12-28");
  expect(weekBoundary("2027-01-01", true)).toBe("2027-01-03");
  expect(weekBoundary("2026-11-02", false)).toBe("2026-11-02");
  expect(weekBoundary("2026-11-08", true)).toBe("2026-11-08");
  expect(weekBoundary("2026-11-08", false)).toBe("2026-11-02");
  expect(weekBoundary("", true)).toBe("");
 });
 it("preserves selected weekdays when extending a cycle", () => {
  const selected = [0,1,0,0,0,0,0,0,0,0,0,1,0,0];
  expect(resizeDays(selected, 3)).toEqual([...selected,0,0,0,0,0,0,0]);
  expect(resizeDays(selected, 1)).toEqual(selected.slice(0,7));
  expect(describeDays(selected)).toBe("1: Вт; 2: Пт");
 });
});
