import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticatedFetch, CSRF_STORAGE_KEY, login, restoreSession, SESSION_EXPIRED_EVENT } from "./auth";
const values = new Map<string, string>();
const events = vi.fn();
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
beforeEach(() => {
  values.clear(); events.mockClear();
  vi.stubGlobal("window", {
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) },
    dispatchEvent: events
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("cookie authentication", () => {
  it("preserves the server explanation for a rejected login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ messages: ["Токен доступа недействителен"] }, 401)));
    await expect(login("invalid", "12345")).rejects.toThrow("Токен доступа недействителен");
    expect(values.size).toBe(0);
  });
  it("sends the validated invitation and PIN as a JSON login, stores only CSRF", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ data: { csrfToken: "csrf" } })); vi.stubGlobal("fetch", fetch);
    await login("invitation", "12345");
    expect(fetch).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST", credentials: "same-origin", body: '{"user_token":"invitation","password":"12345"}' }));
    expect([...values.entries()]).toEqual([[CSRF_STORAGE_KEY, "csrf"]]);
  });
  it("displays the server lockout message and local date", async () => {
    const blockedUntil = "2026-09-14T03:15:00Z";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ resultCode: 1001, messages: [`Пользователь заблокирован до ${blockedUntil}`], blockedUntil }, 401)));
    await expect(login("invite", "00000")).rejects.toThrow(`Пользователь заблокирован до ${new Date(blockedUntil).toLocaleString("ru-RU")}`);
    expect(values.size).toBe(0);
  });
  it("refreshes once for parallel 401 responses and retries with the new CSRF", async () => {
    values.set(CSRF_STORAGE_KEY, "old");
    let refreshes = 0;
    const fetch = vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/auth/refresh") { refreshes++; await Promise.resolve(); return json({ data: { csrfToken: "new" } }); }
      expect(init.credentials).toBe("same-origin");
      expect(init.body).toBe('{"order":"1"}');
      return new Headers(init.headers).get("X-CSRF-Token") === "new" ? json({ ok: true }) : json({ resultCode: 1003 }, 401);
    }); vi.stubGlobal("fetch", fetch);
    const responses = await Promise.all([1, 2, 3].map(() => authenticatedFetch("/api/orders/confirm", { method: "POST", body: '{"order":"1"}' })));
    expect(refreshes).toBe(1); expect(responses.every((r) => r.ok)).toBe(true);
  });
  it("ends authorization on expired refresh without an infinite retry", async () => {
    values.set(CSRF_STORAGE_KEY, "old");
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(json({ resultCode: 1003 }, 401))); vi.stubGlobal("fetch", fetch);
    expect(await restoreSession()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2); expect(values.size).toBe(0);
    expect(events.mock.calls.some(([event]) => event.type === SESSION_EXPIRED_EVENT)).toBe(true);
  });
  it("keeps session data on a temporary refresh failure", async () => {
    values.set(CSRF_STORAGE_KEY, "old");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ resultCode: 1003 }, 401)).mockResolvedValueOnce(json({}, 502)));
    await expect(authenticatedFetch("/api/orders")).rejects.toThrow("Не удалось обновить сессию");
    expect(values.get(CSRF_STORAGE_KEY)).toBe("old"); expect(events).not.toHaveBeenCalled();
  });
  it("does not refresh the RMS session for a 1C authorization error", async () => {
    values.set(CSRF_STORAGE_KEY, "csrf");
    const fetch = vi.fn().mockResolvedValue(json({ message: "1C unauthorized" }, 401)); vi.stubGlobal("fetch", fetch);
    expect((await authenticatedFetch("/api/orders")).status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(values.get(CSRF_STORAGE_KEY)).toBe("csrf");
    expect(events).not.toHaveBeenCalled();
  });
  it("does not retry rejected business/CSRF requests", async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(json({ resultCode: 1002 }, 403))); vi.stubGlobal("fetch", fetch);
    expect((await authenticatedFetch("/api/orders/confirm", { method: "POST" })).status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
