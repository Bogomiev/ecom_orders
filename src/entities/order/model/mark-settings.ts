"use client";

import { useSyncExternalStore } from "react";

const removeCryptoTailKey = "order-remove-mark-crypto-tail";
const storageKey = "order-skip-mark-formatting";
const changeEvent = "order-mark-settings-changed";

export function getStoredSkipMarkFormatting() {
  return typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "true";
}

export function setStoredSkipMarkFormatting(value: boolean) {
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

export function useSkipMarkFormatting() {
  return useSyncExternalStore(subscribe, getStoredSkipMarkFormatting, () => false);
}

export function getStoredRemoveMarkCryptoTail() {
  return typeof window !== "undefined" && window.localStorage.getItem(removeCryptoTailKey) === "true";
}

export function setStoredRemoveMarkCryptoTail(value: boolean) {
  window.localStorage.setItem(removeCryptoTailKey, String(value));
  window.dispatchEvent(new Event(changeEvent));
}

export function useRemoveMarkCryptoTail() {
  return useSyncExternalStore(subscribe, getStoredRemoveMarkCryptoTail, () => false);
}
