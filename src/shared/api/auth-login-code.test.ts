import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CSRF_STORAGE_KEY, createLoginCode, getCurrentUser, loginByCodeFromLocation, loginCodeURL } from "./auth";
const values = new Map<string, string>();
const replaceState = vi.fn();
let href = "";
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
beforeEach(() => {
  values.clear(); replaceState.mockClear();
  vi.stubGlobal("window", {
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) },
    dispatchEvent: vi.fn(),
    get location() { return { href }; },
    history: { state: null, replaceState: (_: unknown, __: string, url: string) => { replaceState(url); } }
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("QR login code", () => {
  it("builds the phone link with the code only", () => {
    expect(loginCodeURL("https://shop.example", "a-b_c")).toBe("https://shop.example/?login_code=a-b_c");
  });
  it("sends the selected store with CSRF and returns the code lifetime", async () => {
    values.set(CSRF_STORAGE_KEY, "csrf");
    const fetch = vi.fn().mockResolvedValue(json({ data: { code: "code", expires_in: 120 } }, 201));
    vi.stubGlobal("fetch", fetch);
    await expect(createLoginCode("store")).resolves.toEqual({ code: "code", expiresIn: 120 });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/auth/login-code");
    expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("csrf");
    expect(JSON.parse(init.body)).toEqual({ store_id: "store" });
  });
  it("signs in once from the address and drops the code from it", async () => {
    href = "https://shop.example/?login_code=abc&x=1#top";
    const fetch = vi.fn().mockResolvedValue(json({ csrfToken: "csrf", store_id: "store", store_name: "Магазин", data: { user: { role: "user", user_token: "seller" } } }));
    vi.stubGlobal("fetch", fetch);
    const first = loginByCodeFromLocation();
    href = "https://shop.example/?x=1#top";
    // A second page effect while the login is in flight waits for the same request.
    expect(loginByCodeFromLocation()).toBe(first);
    await expect(first).resolves.toEqual({ id: "store", name: "Магазин" });
    expect(replaceState).toHaveBeenCalledWith("/?x=1#top");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ code: "abc" });
    expect(getCurrentUser()).toMatchObject({ role: "user", userToken: "seller" });
    expect(loginByCodeFromLocation()).toBeNull();
  });
  it("explains an expired or used code", async () => {
    href = "https://shop.example/?login_code=old";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ resultCode: 1, messages: ["invalid credentials"] }, 401)));
    await expect(loginByCodeFromLocation()).rejects.toThrow("QR-код недействителен или устарел");
    expect(values.has(CSRF_STORAGE_KEY)).toBe(false);
  });
});
