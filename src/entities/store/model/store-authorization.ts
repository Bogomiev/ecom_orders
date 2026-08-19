"use client";

import { useSyncExternalStore } from "react";

const STORE_AUTHORIZATION_SESSION_KEY = "ecom-orders-store-authorized";
const STORE_AUTHORIZATION_CHANGE_EVENT = "ecom-orders-store-authorization-change";

function getSnapshot() {
  return window.sessionStorage.getItem(STORE_AUTHORIZATION_SESSION_KEY) === "true";
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

  if (isAuthorized) {
    window.sessionStorage.setItem(STORE_AUTHORIZATION_SESSION_KEY, "true");
  } else {
    window.sessionStorage.removeItem(STORE_AUTHORIZATION_SESSION_KEY);
  }
  window.dispatchEvent(new Event(STORE_AUTHORIZATION_CHANGE_EVENT));
}

export function useIsStoreAuthorized() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
