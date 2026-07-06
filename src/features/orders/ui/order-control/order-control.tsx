"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Order } from "@/entities/order";
import type { Product } from "@/entities/product";
import { OrderControlDetailsPanel } from "./order-control-details-panel";
import type { ScanNotification } from "./order-control-shared";
import { OrderProcessingResultsPanel } from "./order-processing-results-panel";

type OrderControlProps = {
  isOpen: boolean;
  onClose: () => void;
  onOrderChange: (order: Order) => void;
  order: Order | null;
  products: Product[];
};

export function OrderControl({
  isOpen,
  onClose,
  onOrderChange,
  order,
  products
}: OrderControlProps) {
  const [notification, setNotification] = useState<ScanNotification | null>(null);
  const [isCloseConfirmationOpen, setIsCloseConfirmationOpen] = useState(false);

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

  useEffect(() => {
    if (!isOpen || order === null) {
      return;
    }

    const currentOrder = order;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (currentOrder.items.some((item) => item.quantityFact > 0)) {
        setIsCloseConfirmationOpen(true);
        return;
      }

      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, order]);

  if (!isOpen || order === null) {
    return null;
  }

  const activeOrder = order;
  const lines = activeOrder.items;
  const hasMarkingProducts = lines.some((line) => line.markingProduct);

  function showNotification(message: ReactNode, tone: ScanNotification["tone"]) {
    setNotification({
      id: Date.now(),
      message,
      tone
    });
  }

  function requestClose() {
    if (activeOrder.items.some((item) => item.quantityFact > 0)) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center bg-slate-950/35 p-4"
      role="presentation"
    >
      <div
        aria-modal="true"
        className="mx-auto flex h-[88vh] w-full max-w-[92rem] flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
        role="dialog"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Контроль сборки заказа
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Форма сборки и проверки заказа № {activeOrder.number}
            </p>
          </div>
          <button
            className="self-start rounded-lg border border-transparent px-3 py-1.5 text-sm font-bold text-slate-900 transition hover:bg-slate-300 focus:bg-slate-300 focus:outline-none"
            type="button"
            onClick={requestClose}
          >
            Закрыть
          </button>
        </div>

        <div
          className={`grid min-h-0 flex-1 gap-4 p-4 ${
            hasMarkingProducts ? "lg:grid-cols-2" : "lg:grid-cols-1"
          }`}
        >
          <OrderControlDetailsPanel
            key={activeOrder.id}
            lines={lines}
            order={activeOrder}
            products={products}
            onOrderChange={onOrderChange}
            onNotify={showNotification}
          />
          {hasMarkingProducts ? (
            <OrderProcessingResultsPanel lines={activeOrder.controlledItems} />
          ) : null}
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

        <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-4">
          <button
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-base font-bold text-white shadow-sm transition hover:bg-violet-700 focus:bg-violet-700 focus:outline-none"
            type="button"
            onClick={requestClose}
          >
            Завершить контроль
          </button>
        </div>
      </div>

      {isCloseConfirmationOpen ? (
        <div
          aria-modal="true"
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-600"
              >
                !
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-950">
                  Контроль не завершен полностью!
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Закрыть форму?
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
    </div>
  );
}
