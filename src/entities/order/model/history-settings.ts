export const DEFAULT_ORDER_HISTORY_DAYS = 3;
export const ORDER_HISTORY_DAYS_STORAGE_KEY = "ecom-orders-history-days";
export const ORDER_HISTORY_DAYS_CHANGE_EVENT = "ecom-orders-history-days-change";

export function normalizeOrderHistoryDays(value: unknown) {
  const days = typeof value === "number" ? value : Number(value);
  return Number.isFinite(days) && days >= 1
    ? Math.trunc(days)
    : DEFAULT_ORDER_HISTORY_DAYS;
}

export function getStoredOrderHistoryDays() {
  if (typeof window === "undefined") return DEFAULT_ORDER_HISTORY_DAYS;

  const storedValue = window.localStorage.getItem(ORDER_HISTORY_DAYS_STORAGE_KEY);
  return storedValue === null
    ? DEFAULT_ORDER_HISTORY_DAYS
    : normalizeOrderHistoryDays(storedValue);
}

export function setStoredOrderHistoryDays(value: number) {
  if (typeof window === "undefined") return;

  const days = normalizeOrderHistoryDays(value);
  window.localStorage.setItem(ORDER_HISTORY_DAYS_STORAGE_KEY, String(days));
  window.dispatchEvent(new Event(ORDER_HISTORY_DAYS_CHANGE_EVENT));
}
