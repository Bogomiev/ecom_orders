export const CSRF_STORAGE_KEY = "ecom-orders-csrf-token";
export const SESSION_EXPIRED_EVENT = "ecom-orders-session-expired";
export const AUTH_CHANGED_EVENT = "ecom-orders-auth-changed";
export type Role = { id: number; name: string };
export type User = { userToken?: string; name?: string; role: string; seller_selection_available?: boolean; store_selection_available?: boolean; store_selection_required?: boolean; position?: number | null; position_name?: string | null; roles?: Role[] };
export const USER_STORAGE_KEY = "ecom-orders-user";
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(USER_STORAGE_KEY) ?? "null"); } catch { return null; }
}
const REFRESH_LOCK = "ecom-orders-refresh";
let refreshPromise: Promise<boolean> | null = null;

type AuthResponse = {
  csrfToken?: string;
  userToken?: string;
  data?: { csrfToken?: string; role?: string; user?: { role?: string; name?: string; user_token?: string; seller_selection_available?: boolean; store_selection_available?: boolean; store_selection_required?: boolean; position?: number | null; position_name?: string | null; roles?: Role[] } };
  role?: string;
  resultCode?: number;
  result_code?: number;
  messages?: string[];
  blockedUntil?: string;
};

export function getCSRFToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(CSRF_STORAGE_KEY);
}

function saveCSRF(data: AuthResponse) {
  const csrf = data.csrfToken ?? data.data?.csrfToken;
  if (typeof csrf !== "string" || !csrf) throw new Error("RMS не вернул CSRF-токен");
  window.localStorage.setItem(CSRF_STORAGE_KEY, csrf);
  const role = data.data?.role ?? data.data?.user?.role ?? data.role;
  if (role !== undefined) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
    ...getCurrentUser(), ...data.data?.user, seller_selection_available: data.data?.user?.seller_selection_available ?? false, store_selection_available: data.data?.user?.store_selection_available ?? false, store_selection_required: data.data?.user?.store_selection_required ?? false, roles: data.data?.user?.roles ?? [], position: data.data?.user?.position ?? null, position_name: data.data?.user?.position_name ?? null, userToken: data.userToken ?? data.data?.user?.user_token ?? getCurrentUser()?.userToken, role
  }));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function expireSession() {
  window.localStorage.removeItem(CSRF_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export async function login(userToken: string, password: string, signal?: AbortSignal) {
  const response = await fetch("/api/auth/login", {
    method: "POST", credentials: "same-origin", cache: "no-store", signal,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ user_token: userToken, password })
  });
  const data = await response.json() as AuthResponse;
  if (!response.ok) {
    let message = data.messages?.join("\n") || "Не удалось выполнить вход";
    if ((data.resultCode ?? data.result_code) === 1001 && data.blockedUntil) {
      const date = new Date(data.blockedUntil);
      if (!Number.isNaN(date.getTime())) message = message.replace(data.blockedUntil, date.toLocaleString("ru-RU"));
    } else if (response.status === 401 && !data.messages?.length) message = "Неверный PIN или токен доступа";
    throw new Error(message);
  }
  saveCSRF(data);
}

async function performRefresh(staleCSRF: string | null) {
  // Web Locks serialize refresh across tabs. Recheck after acquiring the lock.
  if (getCSRFToken() && getCSRFToken() !== staleCSRF) return true;
  const response = await fetch("/api/auth/refresh", {
    method: "POST", credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
  });
  if (response.status === 401) { expireSession(); return false; }
  if (!response.ok) throw new Error("Не удалось обновить сессию RMS. Попробуйте ещё раз.");
  saveCSRF(await response.json() as AuthResponse);
  return true;
}

async function refreshSession(staleCSRF: string | null) {
  if (!refreshPromise) {
    const refresh = () => performRefresh(staleCSRF);
    refreshPromise = (typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(REFRESH_LOCK, refresh)
      : refresh()).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// Only use for replayable requests to this application's API. Bodies here are JSON strings.
export async function authenticatedFetch(input: string, init: RequestInit = {}) {
  if (!input.startsWith("/api/") || input.startsWith("//")) throw new Error("Authenticated requests must use a local API path");
  const send = () => {
    const headers = new Headers(init.headers);
    const csrf = getCSRFToken();
    if (!["GET", "HEAD", "OPTIONS"].includes((init.method ?? "GET").toUpperCase()) && csrf) headers.set("X-CSRF-Token", csrf);
    return fetch(input, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  };
  const csrfAtRequest = getCSRFToken();
  let response = await send();
  const failure = [401, 403].includes(response.status) ? await response.clone().json().catch(() => null) : null;
  const sessionInvalid = response.status === 401 && failure?.resultCode === 1003;
  const csrfChanged = response.status === 403 && failure?.resultCode === 1002 && getCSRFToken() !== csrfAtRequest;
  if (sessionInvalid || csrfChanged) {
    if (init.signal?.aborted) return response;
    if (csrfChanged || await refreshSession(csrfAtRequest)) response = await send();
    if (response.status === 401 && (await response.clone().json().catch(() => null))?.resultCode === 1003) expireSession();
  }
  return response;
}

export async function restoreSession() {
  const response = await authenticatedFetch("/api/auth/session");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Не удалось проверить сессию RMS");
  const data = await response.json() as AuthResponse;
  saveCSRF(data);
  if (!data.userToken) throw new Error("RMS не вернул пользователя сессии");
  return { ...getCurrentUser(), userToken: data.userToken, role: getCurrentUser()?.role ?? "" };
}

// Ends the RMS session (RMS clears the cookies) and forgets the local user even if the request fails.
export async function logout() {
  try { await authenticatedFetch("/api/auth/logout", { method: "POST" }); }
  finally { expireSession(); }
}

// A QR login code lets a signed-in user open the service on a phone without the token and PIN.
// It works once and for a short time; storeID is the store the phone opens.
export async function createLoginCode(storeID?: string) {
  const response = await authenticatedFetch("/api/auth/login-code", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(storeID ? { store_id: storeID } : {})
  });
  const data = await response.json().catch(() => null) as { data?: { code?: string; expires_in?: number }; messages?: string[] } | null;
  if (response.status === 401) throw new Error("Сначала войдите в сервис");
  if (!response.ok || !data?.data?.code || !data.data.expires_in) throw new Error(data?.messages?.join("\n") || "Не удалось создать QR-код");
  return { code: data.data.code, expiresIn: data.data.expires_in };
}

export function loginCodeURL(origin: string, code: string) {
  return `${origin}/?${new URLSearchParams({ login_code: code })}`;
}

// Spends a QR login code and returns the store chosen on the device that showed the code.
export async function loginByCode(code: string) {
  const response = await fetch("/api/auth/login-code/redeem", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ code })
  });
  const data = await response.json().catch(() => ({})) as AuthResponse & { store_id?: string; store_name?: string };
  if (response.status === 401 && (data.resultCode ?? data.result_code) !== 1001) throw new Error("QR-код недействителен или устарел. Создайте новый в настройках.");
  if (!response.ok) throw new Error(data.messages?.join("\n") || "Не удалось войти по QR-коду");
  saveCSRF(data);
  return data.store_id ? { id: data.store_id, name: data.store_name ?? "" } : null;
}

type CodeLoginStore = { id: string; name: string } | null;
let codeLogin: Promise<CodeLoginStore> | null = null;
// Takes ?login_code= out of the address and signs in with it. A page effect may run twice
// (React Strict Mode), so a second call while the login is in flight gets the same promise.
export function loginByCodeFromLocation(): Promise<CodeLoginStore> | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("login_code")?.trim();
  if (code) {
    url.searchParams.delete("login_code");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    codeLogin = loginByCode(code).finally(() => { codeLogin = null; });
  }
  return codeLogin;
}
