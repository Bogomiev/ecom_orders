import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trustedOrigin, validCSRF, verifyAccessToken } from "./security";
const secret = "01234567890123456789012345678901";
const payload = { id: 42, purpose: "access", sid: "session", user_token: "invite", csrfToken: "csrf", exp: 2000 };
function sign(claims: object, key = secret, alg = "HS256") {
  const header = Buffer.from(JSON.stringify({ alg })).toString("base64url");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${body}.${createHmac("sha256", key).update(`${header}.${body}`).digest("base64url")}`;
}
beforeEach(() => { vi.stubEnv("RMS_SIGNING_KEY", secret); vi.stubEnv("APP_ORIGIN", "https://app.test"); });
describe("JWT and CSRF", () => {
  it("accepts only signed unexpired access JWTs bound to a session", () => {
    expect(verifyAccessToken(sign(payload), 1000_000)).toEqual(payload);
    for (const raw of [sign(payload, "wrong"), sign(payload, secret, "none"), sign({ ...payload, purpose: "refresh" }), sign({ ...payload, exp: 1000 }), sign({ ...payload, sid: "" }), sign({ ...payload, csrfToken: "" }), sign({ ...payload, nbf: 3000 }), "malformed"]) {
      expect(verifyAccessToken(raw, 1000_000)).toBeNull();
    }
  });
  it("checks CSRF on all unsafe methods", () => {
    const claims = verifyAccessToken(sign(payload), 1000_000)!;
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(validCSRF(new Request("https://app.test", { method }), claims)).toBe(false);
      expect(validCSRF(new Request("https://app.test", { method, headers: { "X-CSRF-Token": "wrong" } }), claims)).toBe(false);
      expect(validCSRF(new Request("https://app.test", { method, headers: { "X-CSRF-Token": "csrf" } }), claims)).toBe(true);
    }
    expect(validCSRF(new Request("https://app.test"), claims)).toBe(true);
  });
  it("requires exact configured origin, including on refresh without access", () => {
    for (const origin of ["null", "https://app.test.evil.test", "http://app.test", "https://evil.test"]) {
      expect(trustedOrigin(new Request("https://app.test/api/auth/refresh", { method: "POST", headers: { Origin: origin } }))).toBe(false);
    }
    expect(trustedOrigin(new Request("https://app.test"))).toBe(false);
    expect(trustedOrigin(new Request("https://app.test", { headers: { Origin: "https://app.test" } }))).toBe(true);
  });
});
