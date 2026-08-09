"use client";

import { memo, useMemo } from "react";
import {
  formatOrderTime,
  getMarketplaceLabel,
  getOrderStatusLabel,
  getOrderTone,
  isOrderUnavailableForOpening,
  type Order
} from "@/entities/order";
import {
  OrderCardHeader,
  OrderMeta,
  OrderStatusBadge
} from "./order-card-parts";

type OrderCardMiniProps = {
  disabled?: boolean;
  isOpening?: boolean;
  onOpen: (order: Order) => void;
  onView: (order: Order) => void;
  order: Order;
};

function OrderCardMiniComponent({
  disabled = false,
  isOpening = false,
  onOpen,
  onView,
  order
}: OrderCardMiniProps) {
  const tone = getOrderTone(order);
  const statusLabel = getOrderStatusLabel(order);
  const cannotOpen = isOrderUnavailableForOpening(order);
  const assembleBefore = useMemo(
    () => formatOrderTime(order.order_created_at),
    [order.order_created_at]
  );
  const marketplace = getMarketplaceLabel(order.source);

  return (
    <article
      aria-label={`${marketplace}, заказ ${order.number}${order.external_id ? ` / ${order.external_id}` : ""}, ${statusLabel}`}
      aria-disabled={disabled || isOpening || cannotOpen}
      className="order-mini-card w-full rounded-xl border app-border app-surface-muted p-2.5 text-left transition-[border-color,box-shadow] hover:border-slate-400 hover:shadow-[0_0_0_1px_#c5cfde] aria-disabled:cursor-wait aria-disabled:opacity-70"
      role="button"
      tabIndex={disabled || isOpening || cannotOpen ? -1 : 0}
      onClick={() => {
        if (!disabled && !isOpening && !cannotOpen) onOpen(order);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (!disabled && !isOpening && !cannotOpen && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen(order);
        }
      }}
    >
      <OrderCardHeader order={order} onView={onView} />
      <OrderStatusBadge order={order} tone={tone} />
      <OrderMeta assembleBefore={assembleBefore} order={order} />
    </article>
  );
}

export const OrderCardMini = memo(OrderCardMiniComponent);
