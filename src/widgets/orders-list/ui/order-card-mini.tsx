"use client";

import { memo, useMemo } from "react";
import {
  formatOrderTime,
  getMarketplaceLabel,
  getOrderStatusLabel,
  getOrderTone,
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
  order: Order;
};

function OrderCardMiniComponent({
  disabled = false,
  isOpening = false,
  onOpen,
  order
}: OrderCardMiniProps) {
  const tone = getOrderTone(order);
  const statusLabel = getOrderStatusLabel(tone);
  const assembleBefore = useMemo(
    () => formatOrderTime(order.order_created_at),
    [order.order_created_at]
  );
  const marketplace = getMarketplaceLabel(order.source);

  return (
    <button
      aria-label={`${marketplace}, заказ ${order.number}, ${statusLabel}`}
      className="order-mini-card w-full rounded-xl border app-border app-surface-muted p-2.5 text-left transition-[border-color,box-shadow] hover:border-slate-400 hover:shadow-[0_0_0_1px_#c5cfde] disabled:cursor-wait disabled:opacity-70"
      disabled={disabled || isOpening}
      type="button"
      onClick={() => onOpen(order)}
    >
      <OrderCardHeader order={order} />
      <OrderStatusBadge tone={tone} />
      <OrderMeta assembleBefore={assembleBefore} order={order} />
    </button>
  );
}

export const OrderCardMini = memo(OrderCardMiniComponent);
