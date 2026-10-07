import { describe, expect, it } from "vitest";
import { formatSalesWeek } from "./sales-week";

describe("formatSalesWeek", () => {
  it("matches the screenshot's week ending yesterday", () => {
    expect(formatSalesWeek(new Date("2026-09-28T12:00:00Z"))).toBe("За неделю, 21–27.09");
  });
  it("shows both months across a month boundary", () => {
    expect(formatSalesWeek(new Date("2026-10-04T12:00:00Z"))).toBe("За неделю, 27.09–03.10");
  });
  it("uses Moscow's calendar day across a year boundary", () => {
    expect(formatSalesWeek(new Date("2026-01-01T22:00:00Z"))).toBe("За неделю, 26.12–01.01");
  });
});
