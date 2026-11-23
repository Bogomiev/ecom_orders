"use client";

import { useSyncExternalStore } from "react";

const storageKey = "order-mark-formatting-enabled";
const changeEvent = "order-mark-formatting-enabled-changed";

export function getStoredMarkFormattingEnabled() {
  return typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "true";
}

export function setStoredMarkFormattingEnabled(value: boolean) {
  window.localStorage.setItem(storageKey, String(value));
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useMarkFormattingEnabled() {
  return useSyncExternalStore(subscribe, getStoredMarkFormattingEnabled, () => false);
}
