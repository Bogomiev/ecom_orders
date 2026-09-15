export const CSRF_STORAGE_KEY = "ecom-orders-csrf-token";
export const SESSION_EXPIRED_EVENT = "ecom-orders-session-expired";
export const AUTH_CHANGED_EVENT = "ecom-orders-auth-changed";
const REFRESH_LOCK = "ecom-orders-refresh";
let refreshPromise: Promise<boolean> | null = null;

type AuthResponse = {
  csrfToken?: string;
  userToken?: string;
  data?: { csrfToken?: string };
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
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function expireSession() {
  window.localStorage.removeItem(CSRF_STORAGE_KEY);
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
  return { userToken: data.userToken };
}
