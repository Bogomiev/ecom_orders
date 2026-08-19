"use client";

import Link from "next/link";
import { StoreSelector } from "@/features/store-selector";
import { SellerSelector } from "@/features/seller-selector";
import { playNotificationSound } from "@/shared/lib/notification-sound";
import { PageNotificationStack } from "@/shared/ui/page-notification";
import { usePageNotifications } from "@/shared/lib/use-page-notifications";
import { showSystemNotification } from "@/shared/lib/system-notification";
import { useClock } from "@/shared/lib/use-clock";
import { useTheme } from "@/shared/lib/use-theme";
import { useActiveOrdersNotification } from "../model/use-active-orders-notification";

const NOTIFICATION_TITLE = "Икорный: сборка";
const TEST_NOTIFICATION_BODY = "Проверка уведомлений для экрана сборки.";

type OrdersPageHeaderProps = {
  ordersCount: number;
};

export function OrdersPageHeader({ ordersCount }: OrdersPageHeaderProps) {
  const { dismiss, notifications, notify } = usePageNotifications(8000);
  const { isDark, toggleTheme } = useTheme();
  const currentTime = useClock();
  useActiveOrdersNotification(ordersCount, notify);

  function handleSignalTestClick() {
    playNotificationSound();
    void showSystemNotification(NOTIFICATION_TITLE, {
      body: TEST_NOTIFICATION_BODY,
      tag: "assembly-notification-test"
    });
    notify({
      body: TEST_NOTIFICATION_BODY,
      title: NOTIFICATION_TITLE,
      tone: "info"
    });
  }

  return (
    <>
      <header className="top-header flex min-h-[4.5rem] items-center justify-between gap-4 border-b app-border app-surface px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="brand-mark grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base font-black text-white">Р</div>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <StoreSelector />
            <SellerSelector />
          </div>
        </div>
        <div className="header-actions flex items-center gap-2.5">
          <span className="header-clock min-w-[4.5rem] text-sm font-extrabold tabular-nums">{currentTime}</span>
          <Link
            aria-label="Открыть инструкции"
            className="header-icon-button grid h-9 w-9 place-items-center rounded-lg border app-border app-surface-muted"
            href="/instructions"
            title="Инструкции"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
              <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18a2 2 0 0 1 2-2h2.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
            </svg>
          </Link>
          <button
            aria-label="Проверить звук"
            className="header-icon-button grid h-9 w-9 place-items-center rounded-lg border app-border app-surface-muted"
            type="button"
            onClick={handleSignalTestClick}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z" />
              <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" />
            </svg>
          </button>
          <button
            aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
            className="header-icon-button grid h-9 w-9 place-items-center rounded-lg border app-border app-surface-muted"
            type="button"
            onClick={toggleTheme}
          >
            {isDark ? (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 4a8 8 0 0 0 0 16V4Z" fill="currentColor" stroke="none" />
              </svg>
            )}
          </button>
        </div>
      </header>
      <PageNotificationStack
        notifications={notifications}
        onClose={dismiss}
      />
    </>
  );
}
