"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_ORDER_HISTORY_DAYS,
  getStoredOrderHistoryDays,
  ORDER_HISTORY_DAYS_CHANGE_EVENT,
  ORDER_HISTORY_DAYS_STORAGE_KEY
} from "./history-settings";

let cachedRawValue: string | null | undefined;
let cachedDays = getServerSnapshot();

function getServerSnapshot() {
  return DEFAULT_ORDER_HISTORY_DAYS;
}

function getSnapshot() {
  const rawValue = window.localStorage.getItem(ORDER_HISTORY_DAYS_STORAGE_KEY);
  if (rawValue !== cachedRawValue) {
    cachedRawValue = rawValue;
    cachedDays = getStoredOrderHistoryDays();
  }
  return cachedDays;
}

function subscribe(callback: () => void) {
  window.addEventListener(ORDER_HISTORY_DAYS_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ORDER_HISTORY_DAYS_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useOrderHistoryDays() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
