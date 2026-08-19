export const ACCESS_STORES_STORAGE_KEY = "access_stores";
export const CURRENT_ACCESS_TOKEN_STORAGE_KEY = "ecom-orders-access-token";

type AccessStores = Record<string, string>;

export function getAccessTokenFromLocation() {
  if (typeof window === "undefined") return null;

  const token = new URLSearchParams(window.location.search)
    .get("access_token")
    ?.trim();

  return token || null;
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CURRENT_ACCESS_TOKEN_STORAGE_KEY)?.trim() || null;
}

export function setStoredAccessToken(token: string | null) {
  if (typeof window === "undefined") return;

  if (token === null || !token.trim()) {
    window.localStorage.removeItem(CURRENT_ACCESS_TOKEN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(CURRENT_ACCESS_TOKEN_STORAGE_KEY, token.trim());
  }
}

export function removeAccessTokenFromLocation() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has("access_token")) return;
  url.searchParams.delete("access_token");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function getStoreUidForAccessToken(token: string) {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(ACCESS_STORES_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    const accessStores = JSON.parse(rawValue) as unknown;

    if (
      typeof accessStores !== "object" ||
      accessStores === null ||
      Array.isArray(accessStores)
    ) {
      return null;
    }

    const uid = (accessStores as AccessStores)[token];
    return typeof uid === "string" && uid.trim() ? uid : null;
  } catch {
    return null;
  }
}

export function setStoreUidForAccessToken(token: string, uid: string) {
  if (typeof window === "undefined") return;

  const rawValue = window.localStorage.getItem(ACCESS_STORES_STORAGE_KEY);
  let accessStores: AccessStores = {};

  if (rawValue) {
    try {
      const parsedValue = JSON.parse(rawValue) as unknown;
      if (
        typeof parsedValue === "object" &&
        parsedValue !== null &&
        !Array.isArray(parsedValue)
      ) {
        accessStores = Object.fromEntries(
          Object.entries(parsedValue).filter(
            ([tokenValue, uidValue]) =>
              tokenValue.trim() && typeof uidValue === "string" && uidValue.trim()
          )
        );
      }
    } catch {
      accessStores = {};
    }
  }

  accessStores[token] = uid;
  window.localStorage.setItem(
    ACCESS_STORES_STORAGE_KEY,
    JSON.stringify(accessStores)
  );
}

export function removeStoreUidForAccessToken(token: string) {
  if (typeof window === "undefined") return;

  const rawValue = window.localStorage.getItem(ACCESS_STORES_STORAGE_KEY);
  if (!rawValue) return;

  try {
    const accessStores = JSON.parse(rawValue) as unknown;
    if (
      typeof accessStores !== "object" ||
      accessStores === null ||
      Array.isArray(accessStores)
    ) {
      return;
    }

    const nextAccessStores = { ...(accessStores as AccessStores) };
    delete nextAccessStores[token];

    if (Object.keys(nextAccessStores).length === 0) {
      window.localStorage.removeItem(ACCESS_STORES_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        ACCESS_STORES_STORAGE_KEY,
        JSON.stringify(nextAccessStores)
      );
    }
  } catch {
    // An unreadable value cannot contain a usable token mapping.
  }
}
