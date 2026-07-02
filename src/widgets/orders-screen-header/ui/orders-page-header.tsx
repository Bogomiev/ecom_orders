"use client";

import { useEffect, useState } from "react";
import {
  PageNotificationStack,
  type PageNotification
} from "@/shared/ui/page-notification";
import { playNotificationSound } from "@/shared/lib/notification-sound";
import { showSystemNotification } from "@/shared/lib/system-notification";

const SHOP_NAME = "Икорный";
const NOTIFICATION_TITLE = "Икорный: сборка";
const TEST_NOTIFICATION_BODY = "Проверка уведомлений для экрана сборки.";
const TOAST_VISIBLE_MS = 8000;

type OrdersPageHeaderProps = {
  currentTime: Date;
  ordersCount: number;
};

const HEADER_LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-[0.22em] text-slate-400";

function formatCurrentTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}

function SignalTestButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
      type="button"
      onClick={onClick}
    >
      Тест сигнала и уведомлений
    </button>
  );
}

export function OrdersHeaderTitle() {
  return (
    <div>
      <div className={HEADER_LABEL_CLASS}>{SHOP_NAME}</div>
      <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">
        Экран сборки заказов
      </h1>
    </div>
  );
}

export function CurrentTimeCard({ currentTime }: { currentTime: Date }) {
  return (
    <div className="min-w-36 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm shadow-slate-300/40">
      <div className={HEADER_LABEL_CLASS}>Сейчас</div>
      <div className="mt-2 text-3xl font-bold leading-none text-slate-950">
        {formatCurrentTime(currentTime)}
      </div>
    </div>
  );
}

export function OrdersCountCard({ ordersCount }: { ordersCount: number }) {
  return (
    <div className="min-w-28 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm shadow-slate-300/40">
      <div className={HEADER_LABEL_CLASS}>На экране</div>
      <div className="mt-2 text-3xl font-bold leading-none text-slate-950">
        {ordersCount}
      </div>
    </div>
  );
}

export function OrdersPageHeader({
  currentTime,
  ordersCount
}: OrdersPageHeaderProps) {
  const [notifications, setNotifications] = useState<PageNotification[]>([]);

  useEffect(() => {
    if (notifications.length === 0) {
      return;
    }

    const latestNotificationId = notifications[notifications.length - 1]?.id;
    const timeoutId = window.setTimeout(() => {
      if (latestNotificationId === undefined) {
        return;
      }

      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) => notification.id !== latestNotificationId
        )
      );
    }, TOAST_VISIBLE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notifications]);

  function closeNotification(id: number) {
    setNotifications((currentNotifications) =>
      currentNotifications.filter((notification) => notification.id !== id)
    );
  }

  function handleSignalTestClick() {
    playNotificationSound();
    showSystemNotification(NOTIFICATION_TITLE, {
      body: TEST_NOTIFICATION_BODY,
      tag: "assembly-notification-test"
    });
    setNotifications((currentNotifications) => [
      ...currentNotifications,
      {
        body: TEST_NOTIFICATION_BODY,
        id: Date.now(),
        title: NOTIFICATION_TITLE,
        tone: "info"
      }
    ]);
  }

  return (
    <>
      <header className="w-full rounded-3xl border border-white/80 bg-blue-50/70 px-6 py-5 shadow-sm shadow-slate-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <OrdersHeaderTitle />
            <div className="mt-3 flex flex-wrap gap-3">
              <CurrentTimeCard currentTime={currentTime} />
              <OrdersCountCard ordersCount={ordersCount} />
            </div>
          </div>
          <SignalTestButton onClick={handleSignalTestClick} />
        </div>
      </header>
      <PageNotificationStack
        notifications={notifications}
        onClose={closeNotification}
      />
    </>
  );
}
