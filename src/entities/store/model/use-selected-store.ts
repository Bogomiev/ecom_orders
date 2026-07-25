"use client";

import { useSyncExternalStore } from "react";
import {
  getStoredStoreSelection,
  STORE_SELECTION_STORAGE_KEY,
  STORE_SELECTION_CHANGE_EVENT
} from "./store-selection";
import type { StoreSelectionSnapshot } from "./store-selection";

let cachedRawValue: string | null | undefined;
let cachedStore: StoreSelectionSnapshot = null;

function getSnapshot() {
  const rawValue = window.localStorage.getItem(STORE_SELECTION_STORAGE_KEY);
  if (rawValue !== cachedRawValue) {
    cachedRawValue = rawValue;
    cachedStore = getStoredStoreSelection();
  }
  return cachedStore;
}

function subscribe(callback: () => void) {
  window.addEventListener(STORE_SELECTION_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORE_SELECTION_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useSelectedStore() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => null
  );
}
