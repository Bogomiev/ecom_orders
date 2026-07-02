"use client";

import { useEffect, useState } from "react";
import { playNotificationSound } from "@/shared/lib/notification-sound";
import { requestSystemNotificationPermission } from "@/shared/lib/system-notification";

const PROMPT_SESSION_STORAGE_KEY = "ecom-orders-notification-prompt-shown";

export function NotificationPermissionPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(PROMPT_SESSION_STORAGE_KEY) === "true") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsVisible(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  async function handleEnableClick() {
    window.sessionStorage.setItem(PROMPT_SESSION_STORAGE_KEY, "true");
    playNotificationSound();
    await requestSystemNotificationPermission();
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-md"
      role="dialog"
    >
      <section className="w-full max-w-[84rem] rounded-[3.5rem] bg-white/95 px-8 py-12 text-center shadow-2xl shadow-slate-950/20 sm:px-16 lg:px-20">
        <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
          Разрешить звук в этой вкладке
        </h2>
        <p className="mx-auto mt-7 max-w-5xl text-xl leading-relaxed text-slate-500 sm:text-3xl">
          Системные уведомления уже доступны. Осталось один раз разблокировать
          звук, чтобы тревога проигрывалась автоматически.
        </p>
        <button
          className="mt-12 w-full rounded-2xl bg-violet-700 px-8 py-7 text-2xl font-extrabold text-white shadow-lg shadow-violet-800/20 transition hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-300 focus:ring-offset-2 sm:text-3xl"
          type="button"
          onClick={handleEnableClick}
        >
          Включить оповещения
        </button>
      </section>
    </div>
  );
}
