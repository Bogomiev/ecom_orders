"use client";

import { useMemo } from "react";
import type { Order } from "@/entities/order";
import type { Product } from "@/entities/product";
import { Dialog } from "@/shared/ui/dialog";
import { HonestSignIcon } from "./order-control/order-control-details-panel";
import { formatMoney, formatNumber } from "./order-control/order-control-shared";

type OrderViewProps = {
  onClose: () => void;
  order: Order | null;
  products: Product[];
};

export function OrderView({ onClose, order, products }: OrderViewProps) {
  const productCodesById = useMemo(
    () => new Map(products.map((product) => [product.uid, product.code])),
    [products]
  );

  if (order === null) return null;

  const orderNumber = `${order.number}${order.external_id ? `/${order.external_id}` : ""}`;
  const total = order.items.reduce((sum, line) => sum + line.amount, 0);

  return (
    <Dialog
      ariaLabelledBy="order-view-title"
      className="relative mx-auto flex h-[min(650px,calc(100vh-32px))] w-[min(700px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl app-surface shadow-2xl [zoom:.83]"
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b app-border px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinejoin="round" d="m12 3 7 4-7 4-7-4 7-4Z" />
              <path strokeLinejoin="round" d="m5 7 7 4 7-4v9l-7 5-7-5V7Z" />
            </svg>
          </div>
          <h2 id="order-view-title" className="min-w-0 break-words text-lg font-bold leading-6 app-text">
            Заказ {orderNumber}
          </h2>
        </div>
        <button
          aria-label="Закрыть"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border app-border app-surface-muted text-lg font-medium leading-none app-muted transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none"
          type="button"
          onClick={onClose}
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
          </colgroup>
          <thead className="sticky top-0 z-[1] app-surface">
            <tr>
              <th className="border-b app-border px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide app-muted">Товар</th>
              <th className="border-b app-border px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Количество</th>
              <th className="border-b app-border px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Цена</th>
              <th className="border-b app-border px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((line) => (
              <tr key={line.product_id}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t app-border app-surface-muted px-5 py-3 text-sm">
        <span className="font-bold app-text">Итого по заказу</span>
        <strong className="font-bold tabular-nums app-text">{formatMoney(total)} ₽</strong>
      </div>
    </Dialog>
  );
}
