"use client";

import { useSyncExternalStore } from "react";

let authorized = false;
const STORE_AUTHORIZATION_CHANGE_EVENT = "ecom-orders-store-authorization-change";

function getSnapshot() {
  return authorized;
}

function subscribe(callback: () => void) {
  window.addEventListener(STORE_AUTHORIZATION_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORE_AUTHORIZATION_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function setStoreAuthorized(isAuthorized: boolean) {
  if (typeof window === "undefined") return;

  authorized = isAuthorized;
  window.dispatchEvent(new Event(STORE_AUTHORIZATION_CHANGE_EVENT));
}

export function useIsStoreAuthorized() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
