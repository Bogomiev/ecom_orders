import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearLegacyAccessStorage, getAccessTokenFromLocation, removeAccessTokenFromLocation } from "./access-store";
const values = new Map<string, string>();
const replaceState = vi.fn();
beforeEach(() => {
  values.clear(); replaceState.mockClear();
  vi.stubGlobal("window", {
    history: { replaceState, state: null },
    location: { href: "http://localhost/?access_token=url-token&view=orders#active", search: "?access_token=url-token&view=orders" },
    localStorage: { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => values.delete(key) }
  });
});
describe("invitation token", () => {
  it("удаляет старые ключи, которые позволяли обходить вход", () => {
    values.set("ecom-orders-access-token", "old-token");
    values.set("access_stores", '{"old-token":"store"}');
    clearLegacyAccessStorage();
    expect(values.size).toBe(0);
  });
  it("берёт токен только из URL", () => {
    values.set("ecom-orders-access-token", "stored-token");
    expect(getAccessTokenFromLocation()).toBe("url-token");
    window.location.search = "";
    expect(getAccessTokenFromLocation()).toBeNull();
  });
  it("поддерживает user_token и удаляет оба параметра, сохраняя остальные", () => {
    window.location.search = "?user_token=new-token&access_token=old-token";
    window.location.href = "http://localhost/?user_token=new-token&access_token=old-token&view=orders#active";
    expect(getAccessTokenFromLocation()).toBe("new-token");
    removeAccessTokenFromLocation();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/?view=orders#active");
  });
});
