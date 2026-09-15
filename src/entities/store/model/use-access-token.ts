"use client";
import { useSyncExternalStore } from "react";
import { getAccessTokenFromLocation } from "./access-store";
import { AUTH_CHANGED_EVENT, getCSRFToken } from "@/shared/api/auth";
const subscribe = (callback: () => void) => {
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};
const getSnapshot = () => Boolean(getAccessTokenFromLocation() || getCSRFToken());
export function useHasAccessToken() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
