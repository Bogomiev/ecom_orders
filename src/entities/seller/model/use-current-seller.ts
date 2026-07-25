"use client";

import { useSyncExternalStore } from "react";
import {
  CURRENT_SELLER_STORAGE_KEY,
  CURRENT_SELLER_CHANGE_EVENT,
  getStoredCurrentSeller
} from "./current-seller";
import type { Seller } from "./types";

let cachedRawValue: string | null | undefined;
let cachedSeller: Seller | null = null;

function getSnapshot() {
  const rawValue = window.localStorage.getItem(CURRENT_SELLER_STORAGE_KEY);
  if (rawValue !== cachedRawValue) {
    cachedRawValue = rawValue;
    cachedSeller = getStoredCurrentSeller();
  }
  return cachedSeller;
}

function subscribe(callback: () => void) {
  window.addEventListener(CURRENT_SELLER_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CURRENT_SELLER_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useCurrentSeller() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
