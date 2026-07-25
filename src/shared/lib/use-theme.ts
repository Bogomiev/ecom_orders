"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "ecom-orders-theme";
const THEME_CHANGE_EVENT = "ecom-orders-theme-change";

function getSnapshot() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useTheme() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? "light" : "dark");
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, [isDark]);

  return { isDark, toggleTheme };
}
