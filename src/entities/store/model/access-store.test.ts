import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAccessTokenFromLocation,
  getStoredAccessToken,
  getStoreUidForAccessToken,
  removeAccessTokenFromLocation,
  setStoredAccessToken,
  setStoreUidForAccessToken
} from "./access-store";

const values = new Map<string, string>();
const replaceState = vi.fn();

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    history: { replaceState, state: null },
    location: {
      href: "http://localhost/?access_token=url-token&view=orders#active",
      search: "?access_token=url-token&view=orders"
    },
    localStorage: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    }
  }
});

describe("access store storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    replaceState.mockClear();
  });

  it("сохраняет активный токен и соответствующий магазин", () => {
    setStoredAccessToken(" token-1 ");
    setStoreUidForAccessToken("token-1", "store-1");

    expect(getStoredAccessToken()).toBe("token-1");
    expect(getStoreUidForAccessToken("token-1")).toBe("store-1");
  });

  it("сначала получает токен из адресной строки", () => {
    setStoredAccessToken("stored-token");
    expect(getAccessTokenFromLocation()).toBe("url-token");
  });

  it("удаляет из адреса только access_token", () => {
    removeAccessTokenFromLocation();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/?view=orders#active"
    );
  });
});
