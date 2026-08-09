import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ORDER_HISTORY_DAYS,
  getStoredOrderHistoryDays,
  ORDER_HISTORY_DAYS_STORAGE_KEY,
  setStoredOrderHistoryDays
} from "./history-settings";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    dispatchEvent: () => true,
    localStorage: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    }
  }
});

describe("order history settings", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses three days by default", () => {
    expect(getStoredOrderHistoryDays()).toBe(DEFAULT_ORDER_HISTORY_DAYS);
    expect(DEFAULT_ORDER_HISTORY_DAYS).toBe(3);
  });

  it("stores the selected number of days", () => {
    setStoredOrderHistoryDays(7);

    expect(window.localStorage.getItem(ORDER_HISTORY_DAYS_STORAGE_KEY)).toBe("7");
    expect(getStoredOrderHistoryDays()).toBe(7);
  });

  it("falls back to the default for an invalid stored value", () => {
    window.localStorage.setItem(ORDER_HISTORY_DAYS_STORAGE_KEY, "invalid");
    expect(getStoredOrderHistoryDays()).toBe(DEFAULT_ORDER_HISTORY_DAYS);
  });
});
