"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Order } from "@/entities/order";
import type { Product } from "@/entities/product";
import { Dialog } from "@/shared/ui/dialog";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { OrderControlDetailsPanel } from "./order-control-details-panel";
import { isOrderLineComplete, type ScanNotification } from "./order-control-shared";

const MAX_QUANTITY_BAGS = 9;

type OrderControlProps = {
  isOpen: boolean;
  isCompleting: boolean;
  onClose: () => void;
  onComplete: (order: Order) => void;
  onOrderChange: (order: Order) => void;
  order: Order | null;
  products: Product[];
};

export function OrderControl({
  isOpen,
  isCompleting,
  onClose,
  onComplete,
  onOrderChange,
  order,
  products
}: OrderControlProps) {
  const [notification, setNotification] = useState<ScanNotification | null>(null);
  const [isCloseConfirmationOpen, setIsCloseConfirmationOpen] = useState(false);
  const [isIncompleteConfirmationOpen, setIsIncompleteConfirmationOpen] = useState(false);

  useEffect(() => {
    if (notification === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notification]);

  if (!isOpen || order === null) {
    return null;
  }

  const activeOrder = order;
  const lines = activeOrder.items.filter((line) => !line.canceled);
  const completedLines = lines.filter(
    isOrderLineComplete
  ).length;
  const progress = lines.length === 0 ? 0 : completedLines / lines.length * 100;

  function setQuantityBags(value: number) {
    onOrderChange({
      ...activeOrder,
      quantityBags: Math.min(MAX_QUANTITY_BAGS, Math.max(0, Math.trunc(value)))
    });
  }

  function showNotification(message: ReactNode, tone: ScanNotification["tone"]) {
    setNotification({
      id: Date.now(),
      message,
      tone
    });
  }

  function requestClose() {
    if (lines.some((item) => item.quantity_fact > 0)) {
      setIsCloseConfirmationOpen(true);
      return;
    }

    onClose();
  }

  function confirmClose() {
    setIsCloseConfirmationOpen(false);
    onClose();
  }

  function cancelClose() {
    setIsCloseConfirmationOpen(false);
  }

  function requestComplete() {
    if (lines.every(isOrderLineComplete)) {
      onComplete(activeOrder);
      return;
    }

    setIsIncompleteConfirmationOpen(true);
  }

  function confirmIncompleteComplete() {
    setIsIncompleteConfirmationOpen(false);
    onComplete(activeOrder);
  }

  function cancelIncompleteComplete() {
    setIsIncompleteConfirmationOpen(false);
  }

  return (
    <Dialog
      ariaLabelledBy="order-control-title"
      className="relative mx-auto flex h-[min(650px,calc(100vh-32px))] w-[min(700px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl app-surface shadow-2xl [zoom:.83]"
      onClose={requestClose}
    >
        <div className="flex items-center justify-between border-b app-border px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinejoin="round" d="m12 3 7 4-7 4-7-4 7-4Z" />
                <path strokeLinejoin="round" d="m5 7 7 4 7-4v9l-7 5-7-5V7Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 id="order-control-title" className="text-lg font-bold leading-6 app-text">
                Сборка заказа
              </h2>
              <p className="truncate text-xs leading-4 app-muted">
                {activeOrder.source} · заказ {activeOrder.number}{activeOrder.external_id ? ` / ${activeOrder.external_id}` : ""}
              </p>
            </div>
          </div>
          <button
            aria-label="Закрыть"
            className="flex h-9 w-9 items-center justify-center rounded-lg border app-border app-surface-muted text-lg leading-none font-medium app-muted transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none"
            type="button"
            onClick={requestClose}
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <OrderControlDetailsPanel
            key={activeOrder.id}
            lines={lines}
            order={activeOrder}
            products={products}
            onOrderChange={onOrderChange}
            onNotify={showNotification}
          />
        </div>

        {notification !== null ? (
          <div
            className={`absolute right-6 top-6 z-10 max-w-md rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
              notification.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
            role="status"
          >
            {notification.message}
          </div>
        ) : null}

        <div className="flex items-center gap-4 border-t app-border app-surface-muted px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2.5">
              <label className="text-sm font-bold app-text" htmlFor="quantity-bags">
                Количество пакетов
              </label>
              <select
                id="quantity-bags"
                aria-label="Количество пакетов"
                className="h-8 w-16 rounded-md border border-red-500 bg-red-50 px-1 text-center text-sm font-bold tabular-nums text-red-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200 disabled:opacity-60 dark:bg-red-950/40 dark:text-red-300"
                disabled={isCompleting}
                value={activeOrder.quantityBags}
                onChange={(event) => {
                  setQuantityBags(Number(event.currentTarget.value));
                }}
              >
                {Array.from({ length: MAX_QUANTITY_BAGS + 1 }, (_, value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
              <span className="app-text">Собрано позиций</span>
              <span className="tabular-nums app-muted">{completedLines} / {lines.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <button
            className="min-w-44 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:bg-emerald-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCompleting}
            type="button"
            onClick={requestComplete}
          >
            {isCompleting ? (
              <span className="inline-flex items-center gap-1">
                Завершение<LoadingDots label="Завершение сборки" />
              </span>
            ) : "Завершить сборку"}
          </button>
        </div>
      {isCloseConfirmationOpen ? (
        <div
          aria-modal="true"
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl app-surface p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-600"
              >
                !
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold app-text">
                  Контроль не завершен полностью!
                </h3>
                <p className="mt-1 text-sm app-muted">
                  Закрыть форму?
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-300 app-surface px-4 py-2 text-sm font-bold app-text transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
                type="button"
                onClick={cancelClose}
              >
                Нет
              </button>
              <button
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                type="button"
                onClick={confirmClose}
              >
                Да
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isIncompleteConfirmationOpen ? (
        <div
          aria-modal="true"
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl app-surface p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-600"
              >
                !
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold app-text">
                  Собраны не все товары. Продолжить?
                </h3>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-300 app-surface px-4 py-2 text-sm font-bold app-text transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
                type="button"
                onClick={cancelIncompleteComplete}
              >
                Нет
              </button>
              <button
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                type="button"
                onClick={confirmIncompleteComplete}
              >
                Да
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
