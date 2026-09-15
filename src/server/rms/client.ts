import { NextRequest, NextResponse } from "next/server";
import { trustedOrigin, validCSRF, verifyAccessToken } from "./security";

export function authError(status: number, resultCode: number, message: string) {
  return NextResponse.json({ resultCode, messages: [message] }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function fetchRMS(path: string, init: RequestInit = {}) {
  const base = process.env.RMS_API_URL;
  if (!base) throw new Error("RMS_API_URL is required");
  return fetch(`${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`, {
    ...init, cache: "no-store", redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(15_000)
  });
}

export function rmsHeaders(request: Request) {
  const headers = new Headers({ Accept: "application/json" });
  const cookies = new NextRequest(request.url, { headers: request.headers }).cookies;
  const values = ["access_token", "refresh_token"].flatMap((name) => {
    const value = cookies.get(name)?.value;
    return value ? [`${name}=${encodeURIComponent(value)}`] : [];
  });
  if (values.length) headers.set("Cookie", values.join("; "));
  for (const name of ["Origin", "X-CSRF-Token", "Content-Type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

// All protected Route Handlers call this before reading a body or contacting 1C.
export async function requireSession(request: Request): Promise<NextResponse | null> {
  try {
    const claims = verifyAccessToken(new NextRequest(request.url, { headers: request.headers }).cookies.get("access_token")?.value);
    if (!claims) return authError(401, 1003, "Сессия истекла");
    if (!validCSRF(request, claims)) return authError(403, 1002, "Недействительный CSRF-токен");
    // RMS checks the persisted session, including revocation, on every request.
    const response = await fetchRMS("/auth/session", { headers: rmsHeaders(request) });
    if (!response.ok) return authError(response.status === 401 ? 401 : 502, response.status === 401 ? 1003 : 1, response.status === 401 ? "Сессия завершена" : "Не удалось проверить сессию RMS");
    return null;
  } catch {
    return authError(502, 1, "Не удалось проверить сессию RMS");
  }
}

export async function proxyRMS(request: Request, path: string, checkOrigin = false) {
  try {
    if (checkOrigin && !trustedOrigin(request)) return authError(403, 1002, "Недопустимый источник запроса");
    const response = await fetchRMS(path, {
      method: request.method, headers: rmsHeaders(request),
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text()
    });
    const headers = new Headers({ "Content-Type": response.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" });
    // Preserve both HttpOnly cookies, including their separate expiry/flags.
    for (const cookie of response.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
    return new NextResponse(await response.arrayBuffer(), { status: response.status, headers });
  } catch {
    return authError(502, 1, "Нет связи с сервером RMS");
  }
}
