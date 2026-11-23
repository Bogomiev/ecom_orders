import { describe, expect, it } from "vitest";
import { earlierStart, storeToday } from "./task-day";

describe("task day", () => {
 it("takes the calendar day in store time", () => {
  expect(storeToday(new Date("2026-11-18T20:30:00Z"))).toBe("2026-11-19");
  expect(storeToday(new Date("2026-11-18T10:00:00Z"))).toBe("2026-11-18");
 });
 it("marks only tasks started before today", () => {
  expect(earlierStart("2026-11-18T06:05:47", "2026-11-19")).toBe("с 18.11");
  expect(earlierStart("2025-12-30T09:00:00", "2026-01-02")).toBe("с 30.12.2025");
  expect(earlierStart("2026-11-19T06:00:00", "2026-11-19")).toBe("");
  expect(earlierStart(undefined, "2026-11-19")).toBe("");
 });
});
