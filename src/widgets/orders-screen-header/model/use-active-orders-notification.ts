"use client";

import { useEffect, useRef } from "react";
import { playNotificationSound } from "@/shared/lib/notification-sound";
import { showSystemNotification } from "@/shared/lib/system-notification";

const NOTIFICATION_TITLE = "Икорный: сборка";
const INTERVAL_MS = 60_000;

function getOrderCountLabel(count: number) {
  const lastTwo = Math.abs(count) % 100;
  const last = Math.abs(count) % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} заказов`;
  if (last === 1) return `${count} заказ`;
  if (last >= 2 && last <= 4) return `${count} заказа`;
  return `${count} заказов`;
}

export function useActiveOrdersNotification(
  ordersCount: number,
  notify: (input: {
    body: string;
    title: string;
    tone: "warning";
  }) => void
) {
  const countRef = useRef(ordersCount);

  useEffect(() => {
    countRef.current = ordersCount;
  }, [ordersCount]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (countRef.current === 0) return;
      const body = `В очереди сборки остается ${getOrderCountLabel(countRef.current)}`;
      playNotificationSound();
      void showSystemNotification(NOTIFICATION_TITLE, {
        body,
        tag: "assembly-active-orders"
      });
      notify({ body, title: NOTIFICATION_TITLE, tone: "warning" });
    }, INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [notify]);
}
