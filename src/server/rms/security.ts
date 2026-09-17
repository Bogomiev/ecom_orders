import { createHmac, timingSafeEqual } from "node:crypto";

export type AccessClaims = {
  purpose: "access";
  id: number;
  user_token: string;
  sid: string;
  csrfToken: string;
  exp: number;
};

export function appOrigin() {
  const value = process.env.APP_ORIGIN;
  if (!value || new URL(value).origin !== value) throw new Error("APP_ORIGIN must be configured as an exact origin");
  if (process.env.NODE_ENV === "production" && !value.startsWith("https://")) throw new Error("APP_ORIGIN must use HTTPS in production");
  return value;
}

export function trustedOrigin(request: Request) {
  return request.headers.get("origin") === appOrigin();
}

export function verifyAccessToken(raw: string | undefined, now = Date.now()): AccessClaims | null {
  const secret = process.env.RMS_SIGNING_KEY;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("RMS_SIGNING_KEY must contain at least 32 bytes");
  if (!raw || raw.length > 16_384) return null;
  const parts = raw.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (header.alg !== "HS256") return null;
    const signature = Buffer.from(parts[2], "base64url");
    const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (claims.purpose !== "access" || typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= now / 1000 ||
        (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf > now / 1000)) ||
        typeof claims.csrfToken !== "string" || !claims.csrfToken || typeof claims.sid !== "string" || !claims.sid ||
        !Number.isSafeInteger(claims.id) || claims.id <= 0 || typeof claims.user_token !== "string" || !claims.user_token) return null;
    return claims as AccessClaims;
  } catch { return null; }
}

export function validCSRF(request: Request, claims: AccessClaims) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const received = Buffer.from(request.headers.get("X-CSRF-Token") ?? "");
  const expected = Buffer.from(claims.csrfToken);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
