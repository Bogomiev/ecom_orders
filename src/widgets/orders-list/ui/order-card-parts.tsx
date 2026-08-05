"use client";

import { useState, type MouseEvent } from "react";
import {
  formatOrderMoney,
  getMarketplaceLabel,
  getOrderStatusLabel,
  type Order,
  type OrderTone
} from "@/entities/order";
import { Dialog } from "@/shared/ui/dialog";

export function normalizeOrderComment(comment: string) {
  return comment.replace(/^Комментарий:\s*/i, "");
}

function OrderComment({ comment }: { comment: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedComment = normalizeOrderComment(comment);

  if (normalizedComment.length === 0) return null;

  function handleOpen(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        className="mt-2 block w-full truncate text-left text-sm text-blue-600 underline decoration-blue-400 underline-offset-2 hover:text-blue-700"
        title={normalizedComment}
        type="button"
        onClick={handleOpen}
      >
        {normalizedComment}
      </button>

      {isOpen ? (
        <Dialog
          ariaLabel="Комментарий к заказу"
          className="w-full max-w-xl overflow-hidden rounded-xl app-surface shadow-2xl"
          onClose={handleClose}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b app-border px-4 py-3">
              <h2 className="text-base font-extrabold">
                Комментарий к заказу
              </h2>
              <button
                aria-label="Закрыть"
                className="grid size-10 place-items-center rounded-lg text-2xl font-bold hover:bg-slate-500/10"
                type="button"
                onClick={handleClose}
              >
                ×
              </button>
            </div>
            <p className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap break-words px-4 py-5 text-sm app-text">
              {normalizedComment}
            </p>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

export function OrderCardHeader({ order }: { order: Order }) {
  const marketplace = getMarketplaceLabel(order.source);
  return (
    <div className="order-card-header flex flex-wrap items-center gap-2.5">
      <span className={`marketplace-badge marketplace-${marketplace.toLowerCase()} inline-flex min-h-6 items-center rounded-md px-2.5 text-xs font-extrabold`}>
        {marketplace}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium app-muted">
        {order.number}{order.external_id ? `/${order.external_id}` : ""}
      </span>
    </div>
  );
}

export function OrderStatusBadge({ order, tone }: { order: Order; tone: OrderTone }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className={`order-status-pill inline-flex min-h-7 min-w-0 items-center gap-2 rounded-full px-3 text-xs font-extrabold order-status-${tone}`}>
        <span className="status-dot h-2 w-2 shrink-0 rounded-full" />
        <span className="truncate">{getOrderStatusLabel(order)}</span>
      </span>
      <span className="delivery-badge inline-flex min-h-7 shrink-0 items-center rounded-md border app-border app-surface px-2.5 text-xs font-extrabold">
        {order.source.toLowerCase().includes("сайт") ? "Самовывоз" : "Доставка"}
      </span>
    </div>
  );
}

export function OrderMeta({
  assembleBefore,
  className = "mt-3",
  order
}: {
  assembleBefore: string;
  className?: string;
  order: Order;
}) {
  return (
    <div className={className}>
      <div className="order-card-meta grid grid-cols-3 gap-2">
        <div><span className="order-meta-label">Позиций</span><strong className="order-meta-value">{order.items.length}</strong></div>
        <div><span className="order-meta-label">Сумма</span><strong className="order-meta-value">{formatOrderMoney(order.order_sum)} ₽</strong></div>
        <div><span className="order-meta-label">Собрать до</span><strong className="order-meta-value">{assembleBefore}</strong></div>
      </div>
      <OrderComment comment={order.comment} />
    </div>
  );
}
