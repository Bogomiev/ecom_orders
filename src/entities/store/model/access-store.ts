export const ACCESS_STORES_STORAGE_KEY = "access_stores";
export const CURRENT_ACCESS_TOKEN_STORAGE_KEY = "ecom-orders-access-token";

export function clearLegacyAccessStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_STORES_STORAGE_KEY);
  window.localStorage.removeItem(CURRENT_ACCESS_TOKEN_STORAGE_KEY);
}

export function getAccessTokenFromLocation() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return (params.get("user_token") ?? params.get("access_token"))?.trim() || null;
}

export function removeAccessTokenFromLocation() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("access_token");
  url.searchParams.delete("user_token");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
