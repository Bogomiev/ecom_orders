"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type {
  PageNotification,
  PageNotificationTone
} from "@/shared/ui/page-notification";

type NotificationInput = {
  body: ReactNode;
  title: string;
  tone?: PageNotificationTone;
};

export function usePageNotifications(defaultDurationMs = 5000) {
  const [notifications, setNotifications] = useState<PageNotification[]>([]);
  const timersRef = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (input: NotificationInput, durationMs = defaultDurationMs) => {
      const id = crypto.randomUUID();
      setNotifications((current) => [...current, { id, ...input }]);
      timersRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), durationMs)
      );
      return id;
    },
    [defaultDurationMs, dismiss]
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    },
    []
  );

  return { dismiss, notifications, notify };
}
