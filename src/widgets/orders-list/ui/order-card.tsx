"use client";

import { memo, useMemo, type MouseEvent } from "react";
import {
  formatOrderTime,
  getOrderTone,
  isOrderAwaitingConfirmation,
  type Order
} from "@/entities/order";
import {
  OrderCardHeader,
  OrderMeta,
  OrderStatusBadge
} from "./order-card-parts";

type OrderCardProps = {
  isConfirming?: boolean;
  isOpening?: boolean;
  onCollapse: () => void;
  onConfirm: (order: Order) => void;
  onStartControl: (order: Order) => void;
  order: Order;
};

function OrderCardComponent({
  isConfirming = false,
  isOpening = false,
  onCollapse,
  onConfirm,
  onStartControl,
  order
}: OrderCardProps) {
  const tone = getOrderTone(order);
  const isConfirmation = isOrderAwaitingConfirmation(order);
  const assembleBefore = useMemo(
    () => formatOrderTime(order.order_created_at),
    [order.order_created_at]
  );

  function handlePrimaryAction(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (isConfirmation) onConfirm(order);
    else onStartControl(order);
  }

  return (
    <article
      className={`order-full-card order-full-card-${tone} w-full rounded-xl border-2 border-blue-500 app-surface-muted p-2.5`}
      role="button"
      tabIndex={0}
      onClick={onCollapse}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCollapse();
        }
      }}
    >
      <OrderCardHeader order={order} />
      <OrderStatusBadge tone={tone} />
      <OrderMeta assembleBefore={assembleBefore} className="mt-2" order={order} />

      <div className="order-card-actions mt-3 grid grid-cols-2 gap-2 border-t pt-3">
        <button className="order-cancel-button min-h-[2.125rem] rounded-lg border border-slate-300 app-surface text-xs font-extrabold" type="button" onClick={(event) => event.stopPropagation()}>
          Отмена
        </button>
        <button
          className="order-primary-button min-h-[2.125rem] rounded-lg bg-emerald-600 text-xs font-extrabold text-white"
          disabled={isOpening || isConfirming}
          type="button"
          onClick={handlePrimaryAction}
        >
          {isOpening || isConfirming
            ? "..."
            : isConfirmation
              ? "Подтвердить заказ"
              : "Собрать"}
        </button>
      </div>
    </article>
  );
}

export const OrderCard = memo(OrderCardComponent);
