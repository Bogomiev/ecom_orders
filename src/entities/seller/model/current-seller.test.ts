import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_SELLER_TTL_HOURS,
  getStoredCurrentSeller,
  setStoredCurrentSeller
} from "./current-seller";

const seller = { id: "1", name: "Соколов А.В.", userId: "seller-1" };
const values = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    dispatchEvent: () => true,
    localStorage: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    }
  }
});

describe("current seller storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("возвращает выбранного продавца до истечения TTL", () => {
    expect(CURRENT_SELLER_TTL_HOURS).toBe(16);
    setStoredCurrentSeller(seller);
    expect(getStoredCurrentSeller()).toEqual(seller);
  });

  it("удаляет продавца после истечения TTL", () => {
    vi.useFakeTimers();
    setStoredCurrentSeller(seller);
    vi.advanceTimersByTime((CURRENT_SELLER_TTL_HOURS + 1) * 60 * 60 * 1000);
    expect(getStoredCurrentSeller()).toBeNull();
  });
});
