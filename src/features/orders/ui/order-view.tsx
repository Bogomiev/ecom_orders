"use client";

import { useMemo, useState } from "react";
import { isOrderAwaitingConfirmation, type Order, type OrderItem } from "@/entities/order";
import type { Product } from "@/entities/product";
import { Dialog } from "@/shared/ui/dialog";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { HonestSignIcon } from "./order-control/order-control-details-panel";
import { formatMoney, formatNumber } from "./order-control/order-control-shared";

type OrderViewProps = {
  isConfirming?: boolean;
  onClose: () => void;
  onCancelItem: (order: Order, item: OrderItem) => Promise<boolean>;
  onConfirm: (order: Order) => void;
  order: Order | null;
  products: Product[];
};

export function OrderView({ isConfirming = false, onCancelItem, onClose, onConfirm, order, products }: OrderViewProps) {
  const [cancellingProductId, setCancellingProductId] = useState<string | null>(null);
  const [itemPendingCancellation, setItemPendingCancellation] = useState<OrderItem | null>(null);
  const productCodesById = useMemo(
    () => new Map(products.map((product) => [product.uid, product.code])),
    [products]
  );

  if (order === null) return null;

  const orderNumber = `${order.number}${order.external_id ? `/${order.external_id}` : ""}`;
  const total = order.items.reduce(
    (sum, line) => line.canceled ? sum : sum + line.amount,
    0
  );
  const canEdit = isOrderAwaitingConfirmation(order);
  const isCancelling = cancellingProductId !== null;
  const activeLinesCount = order.items.filter((line) => !line.canceled).length;

  function requestClose() {
    if (!isCancelling) onClose();
  }

  async function cancelItem(item: OrderItem) {
    setCancellingProductId(item.product_id);
    try {
      await onCancelItem(order!, item);
    } finally {
      setCancellingProductId(null);
      setItemPendingCancellation(null);
    }
  }

  return (
    <Dialog
      ariaLabelledBy="order-view-title"
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
            <h2 id="order-view-title" className="break-words text-lg font-bold leading-6 app-text">
              Заказ {orderNumber}
            </h2>
            {order.deliveryMethod === "delivery" && order.address ? (
              <div className="mt-1 break-words text-xs leading-4 app-muted">
                <span className="font-bold app-text">Адрес доставки:</span> {order.address}
              </div>
            ) : null}
            {order.delivery_date || order.delivery_time ? (
              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 break-words text-xs leading-4 app-muted">
                {order.delivery_date ? (
                  <span><span className="font-bold app-text">Дата доставки:</span> {order.delivery_date}</span>
                ) : null}
                {order.delivery_time ? (
                  <span><span className="font-bold app-text">Желаемое время доставки:</span> с {order.delivery_time} по {order.delivery_time_by}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <button
          aria-label="Закрыть"
          className="flex h-9 w-9 shrink-0 self-start items-center justify-center rounded-lg border app-border app-surface-muted text-lg font-medium leading-none app-muted transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none"
          disabled={isCancelling}
          type="button"
          onClick={requestClose}
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
            {canEdit ? <col className="w-16" /> : null}
          </colgroup>
          <thead className="sticky top-0 z-[1] app-surface">
            <tr>
              <th className="border-b app-border px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide app-muted">Товар</th>
              <th className="border-b app-border px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Количество</th>
              <th className="border-b app-border px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Цена</th>
              <th className="border-b app-border px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Сумма</th>
              {canEdit ? <th aria-label="Действия" className="border-b app-border px-3 py-2.5" /> : null}
            </tr>
          </thead>
          <tbody>
            {order.items.map((line) => (
              <tr className={line.canceled ? "line-through opacity-60" : undefined} key={line.product_id}>
                <td className="border-b app-border px-5 py-2.5">
                  <div className="flex items-start gap-2.5">
                    {line.marking_product ? <HonestSignIcon /> : null}
                    <div className="min-w-0">
                      <div className="break-words text-[13px] font-bold leading-[18px] app-text">
                        {line.product_name}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-4 app-muted">
                        Код {productCodesById.get(line.product_id) ?? line.product_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="border-b app-border px-3 py-2.5 text-right text-sm font-bold tabular-nums app-text">
                  {formatNumber(line.quantity)}
                </td>
                <td className="border-b app-border px-3 py-2.5 text-right text-sm font-medium tabular-nums app-text">
                  {formatMoney(line.price)} ₽
                </td>
                <td className="border-b app-border px-5 py-2.5 text-right text-sm font-bold tabular-nums app-text">
                  {formatMoney(line.amount)} ₽
                </td>
                {canEdit ? (
                  <td className="border-b app-border px-3 py-2.5 text-center no-underline">
                    {!line.canceled ? (
                      <button
                        aria-label={`Отменить товар ${line.product_name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-lg font-bold leading-none text-red-600 transition hover:border-red-500 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isCancelling || activeLinesCount <= 1}
                        title={activeLinesCount <= 1 ? "Нельзя отменить последнюю строку" : "Отменить строку"}
                        type="button"
                        onClick={() => {
                          if (activeLinesCount > 1 && !isCancelling) {
                            setItemPendingCancellation(line);
                          }
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 border-t app-border app-surface-muted px-5 py-3 text-sm">
        <span className="font-bold app-text">Итого по заказу</span>
        <div className="flex items-center gap-4">
          <strong className="font-bold tabular-nums app-text">{formatMoney(total)} ₽</strong>
          {canEdit ? (
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
              disabled={isCancelling || isConfirming}
              type="button"
              onClick={() => onConfirm(order)}
            >
              {isConfirming ? <LoadingDots label="Подтверждение заказа" /> : "Подтвердить"}
            </button>
          ) : null}
        </div>
      </div>

      {itemPendingCancellation !== null ? (
        <div
          aria-modal="true"
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <div className="w-full max-w-xs rounded-xl app-surface p-5 shadow-2xl">
            <h3 className="text-base font-bold app-text">Отменить строку?</h3>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border app-border px-4 py-2 text-sm font-bold app-text transition hover:bg-slate-100"
                disabled={isCancelling}
                type="button"
                onClick={() => setItemPendingCancellation(null)}
              >
                Нет
              </button>
              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                disabled={isCancelling}
                type="button"
                onClick={() => void cancelItem(itemPendingCancellation)}
              >
                {isCancelling ? (
                  <span className="inline-flex items-center gap-1">
                    Отмена<LoadingDots label="Отмена строки заказа" />
                  </span>
                ) : "Да"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
