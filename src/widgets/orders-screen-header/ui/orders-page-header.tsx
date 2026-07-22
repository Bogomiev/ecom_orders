"use client";

import { useEffect, useRef, useState } from "react";
import { StoreSelector } from "@/features/store-selector";
import { SellerSelector } from "@/features/seller-selector";
import { playNotificationSound } from "@/shared/lib/notification-sound";
import {
  PageNotificationStack,
  type PageNotification
} from "@/shared/ui/page-notification";
import { showSystemNotification } from "@/shared/lib/system-notification";

const NOTIFICATION_TITLE = "Икорный: сборка";
const TEST_NOTIFICATION_BODY = "Проверка уведомлений для экрана сборки.";
const ACTIVE_ORDERS_NOTIFICATION_INTERVAL_MS = 60_000;
const TOAST_VISIBLE_MS = 8000;

type OrdersPageHeaderProps = {
  ordersCount: number;
};

function getOrderCountLabel(ordersCount: number) {
  const lastTwoDigits = Math.abs(ordersCount) % 100;
  const lastDigit = Math.abs(ordersCount) % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${ordersCount} заказов`;
  }

  if (lastDigit === 1) {
    return `${ordersCount} заказ`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${ordersCount} заказа`;
  }

  return `${ordersCount} заказов`;
}

export function OrdersPageHeader({ ordersCount }: OrdersPageHeaderProps) {
  const [notifications, setNotifications] = useState<PageNotification[]>([]);
  const ordersCountRef = useRef(ordersCount);

  useEffect(() => {
    ordersCountRef.current = ordersCount;
  }, [ordersCount]);

  useEffect(() => {
    function notifyAboutActiveOrders() {
      const activeOrdersCount = ordersCountRef.current;

      if (activeOrdersCount === 0) {
        return;
      }

      const body = `В очереди сборки остается ${getOrderCountLabel(activeOrdersCount)}`;

      playNotificationSound();
      void showSystemNotification(NOTIFICATION_TITLE, {
        body,
        tag: "assembly-active-orders"
      });
      setNotifications((currentNotifications) => [
        ...currentNotifications,
        {
          body,
          id: Date.now(),
          title: NOTIFICATION_TITLE,
          tone: "warning"
        }
      ]);
    }

    const intervalId = window.setInterval(
      notifyAboutActiveOrders,
      ACTIVE_ORDERS_NOTIFICATION_INTERVAL_MS
    );

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (notifications.length === 0) return;

    const latestNotificationId = notifications.at(-1)?.id;
    const timeoutId = window.setTimeout(() => {
      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) => notification.id !== latestNotificationId
        )
      );
    }, TOAST_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [notifications]);

  function handleSignalTestClick() {
    playNotificationSound();
    void showSystemNotification(NOTIFICATION_TITLE, {
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
      <header className="w-full rounded-[1.75rem] border border-white/90 bg-slate-50/95 px-2.5 py-2.5 shadow-sm shadow-slate-200/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 max-w-full flex-wrap gap-2 self-start">
            <StoreSelector />
            <SellerSelector />
          </div>
          <button
            className="min-h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold leading-none tracking-wide text-slate-950 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="button"
            onClick={handleSignalTestClick}
          >
            Тест сигнала и уведомлений
          </button>
        </div>
      </header>
      <PageNotificationStack
        notifications={notifications}
        onClose={(id) =>
          setNotifications((currentNotifications) =>
            currentNotifications.filter((notification) => notification.id !== id)
          )
        }
      />
    </>
  );
}
