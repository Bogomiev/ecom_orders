"use client";

import { useEffect } from "react";
import { APP_VERSION } from "../config/app-version";

export function AppVersionUpdater() {
  useEffect(() => {
    let stopped = false;
    let checking = false;
    let reloading = false;
    const controller = new AbortController();

    async function checkVersion() {
      if (checking || reloading || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const response = await fetch("/api/version", {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (stopped || typeof data !== "object" || data === null ||
            !("version" in data) || typeof data.version !== "string" ||
            !data.version || data.version === APP_VERSION) return;

        // Let the user finish dialogs, editing and pending operations first.
        if (document.querySelector('[role="dialog"], [aria-busy="true"]') ||
            document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) return;

        reloading = true;
        window.location.reload();
      } catch {
        // Deployment or network interruptions are retried at the next check.
      } finally {
        checking = false;
      }
    }

    const check = () => { void checkVersion(); };
    const interval = window.setInterval(check, 180_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();

    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}
