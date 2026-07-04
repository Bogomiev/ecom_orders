import type { Store } from "./types";

export type StoreSelectionSnapshot = {
  id: string;
  name: string;
} | null;

export const STORE_SELECTION_STORAGE_KEY = "ecom-orders-selected-store";
export const STORE_SELECTION_CHANGE_EVENT = "ecom-orders-store-selection-change";

function isStoreSelectionSnapshot(value: unknown): value is Exclude<StoreSelectionSnapshot, null> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    "name" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

export function getStoredStoreSelection(): StoreSelectionSnapshot {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(STORE_SELECTION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const value = JSON.parse(rawValue);

    return isStoreSelectionSnapshot(value) ? value : null;
  } catch {
    return null;
  }
}

export function setStoredStoreSelection(store: StoreSelectionSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  if (store === null) {
    window.localStorage.removeItem(STORE_SELECTION_STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORE_SELECTION_STORAGE_KEY, JSON.stringify(store));
  }

  window.dispatchEvent(
    new CustomEvent<StoreSelectionSnapshot>(STORE_SELECTION_CHANGE_EVENT, {
      detail: store
    })
  );
}

export function toStoreSelectionSnapshot(store: Store): Exclude<StoreSelectionSnapshot, null> {
  return {
    id: store.id,
    name: store.name
  };
}
