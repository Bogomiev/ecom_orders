"use client";

import { useState } from "react";
import { Dialog } from "@/shared/ui/dialog";
import { useOrderHistoryDays, setStoredOrderHistoryDays } from "@/entities/order";
import Link from "next/link";
import Image from "next/image";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storeTrigger, setStoreTrigger] = useState<HTMLDivElement | null>(null);
  const historyDays = useOrderHistoryDays();
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
        <div className="header-identity flex min-w-0 flex-1 items-center gap-3">
          <Image src="/icon.svg" alt="Икорный: Сборка" width={32} height={32} className="brand-mark" unoptimized />
          <div className="header-selectors flex min-w-0 flex-1 flex-wrap gap-2">
            <SellerSelector />
          </div>
        </div>
        <div className="header-actions flex items-center gap-2.5">
          <span className="header-clock min-w-[4.5rem] text-sm font-extrabold tabular-nums">{currentTime}</span>
          <button aria-label="Настройки" title="Настройки" aria-haspopup="dialog" className="header-icon-button grid h-9 w-9 place-items-center rounded-lg border app-border app-surface-muted" type="button" onClick={() => setSettingsOpen(true)}>
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="m9.5 3-.6 2.4-2 .9-2.2-.3-1.5 2.6 1.6 1.8v3.2l-1.6 1.8 1.5 2.6 2.2-.3 2 .9.6 2.4h5l.6-2.4 2-.9 2.2.3 1.5-2.6-1.6-1.8v-3.2l1.6-1.8-1.5-2.6-2.2.3-2-.9L14.5 3Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>
      <StoreSelector triggerContainer={storeTrigger} hideTrigger />
      {settingsOpen ? (
        <Dialog ariaLabelledBy="screen-settings-title" className="w-full max-w-lg max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl app-surface shadow-2xl" onClose={() => setSettingsOpen(false)}>
          <div className="flex items-center justify-between border-b app-border px-5 py-4">
            <h2 id="screen-settings-title" className="text-lg font-extrabold">Настройки</h2>
            <button aria-label="Закрыть" className="h-9 w-9 rounded-lg border app-border app-surface-muted text-lg" type="button" onClick={() => setSettingsOpen(false)}>×</button>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div><p className="mb-2 text-sm font-bold">Магазин</p><div ref={setStoreTrigger} /></div>
            <button className="flex w-full items-center gap-3 rounded-lg border app-border app-surface-muted px-4 py-3 text-left text-sm font-bold" type="button" onClick={handleSignalTestClick}>
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z" />
                <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" />
              </svg>
              <span>Проверка уведомлений</span>
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg border app-border app-surface-muted px-4 py-3 text-left text-sm font-bold" type="button" onClick={toggleTheme}>
              {isDark ? (
                <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 4a8 8 0 0 0 0 16V4Z" fill="currentColor" stroke="none" />
                </svg>
              )}
              <span>Тема: {isDark ? "Тёмная" : "Светлая"}</span>
            </button>
            <label className="flex flex-wrap items-center gap-2 text-sm" htmlFor="order-history-days">
              <span>Отображать выданные и отмененные заказы</span>
              <input id="order-history-days" aria-label="Количество дней отображения истории заказов" className="h-9 w-20 rounded-lg border app-border app-surface-muted px-2 text-center font-bold" inputMode="numeric" min="1" step="1" type="number" value={historyDays} onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;
                if (Number.isFinite(value) && value >= 1) setStoredOrderHistoryDays(value);
              }} />
              <span>дней</span>
            </label>
            <Link className="block text-sm font-bold text-blue-600" href="/instructions">Инструкции</Link>
          </div>
        </Dialog>
      ) : null}
      <PageNotificationStack
        notifications={notifications}
        onClose={dismiss}
      />
    </>
  );
}
