import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxyRMS, requireSession } from "./client";
const secret = "01234567890123456789012345678901";
function token() {
  const header = Buffer.from('{"alg":"HS256"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ id: 1, user_token: "invite", purpose: "access", csrfToken: "csrf", sid: "session", exp: Date.now() / 1000 + 60 })).toString("base64url");
  return `${header}.${payload}.${createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")}`;
}
beforeEach(() => {
  vi.stubEnv("RMS_SIGNING_KEY", secret); vi.stubEnv("RMS_API_URL", "http://rms.test"); vi.stubEnv("APP_ORIGIN", "https://app.test");
});
describe("RMS proxy and Route Handler guard", () => {
  it("rejects unauthenticated and CSRF requests before contacting RMS or 1C", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await requireSession(new Request("https://app.test/api/orders")))?.status).toBe(401);
    expect((await requireSession(new Request("https://app.test/api/orders/confirm", { method: "POST", headers: { Cookie: `access_token=${token()}` } })))?.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("checks server-side revocation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
    expect((await requireSession(new Request("https://app.test/api/orders", { headers: { Cookie: `access_token=${token()}` } })))?.status).toBe(401);
  });
  it("preserves the POST body for the protected handler", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    const request = new Request("https://app.test/api/orders/confirm", { method: "POST", headers: { Cookie: `access_token=${token()}`, "X-CSRF-Token": "csrf" }, body: '{"order":"1"}' });
    expect(await requireSession(request)).toBeNull();
    expect(await request.text()).toBe('{"order":"1"}');
  });
  it("forwards origin and login body, preserving separate secure cookies", async () => {
    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append("Set-Cookie", "access_token=access; Path=/; HttpOnly; Secure; SameSite=Lax");
    headers.append("Set-Cookie", "refresh_token=refresh; Path=/; HttpOnly; Secure; SameSite=Strict");
    const fetch = vi.fn().mockResolvedValue(new Response('{"csrfToken":"csrf"}', { headers })); vi.stubGlobal("fetch", fetch);
    const response = await proxyRMS(new Request("https://app.test/api/auth/login", { method: "POST", headers: { Origin: "https://app.test", "Content-Type": "application/json" }, body: '{"user_token":"invite","password":"12345"}' }), "/auth/login", true);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ csrfToken: "csrf" });
    const init = fetch.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('{"user_token":"invite","password":"12345"}');
    expect(new Headers(init.headers).get("Origin")).toBe("https://app.test");
    expect(init.redirect).toBe("error");
  });
  it("blocks missing/foreign Origin on login and refresh without requiring access", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    for (const path of ["/auth/login", "/auth/refresh"]) {
      const response = await proxyRMS(new Request(`https://app.test/api${path}`, { method: "POST", headers: { Origin: "https://evil.test" } }), path, true);
      expect(response.status).toBe(403);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
