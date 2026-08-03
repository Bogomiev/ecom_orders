"use client";

import { memo, useMemo, type MouseEvent } from "react";
import {
  formatOrderTime,
  getOrderTone,
  isOrderAwaitingConfirmation,
  isOrderReady,
  isOrderTransferredToCourier,
  type Order
} from "@/entities/order";
import {
  OrderCardHeader,
  OrderMeta,
  OrderStatusBadge
} from "./order-card-parts";

type OrderCardProps = {
  isCancelling?: boolean;
  isCompleting?: boolean;
  isConfirming?: boolean;
  isOpening?: boolean;
  isGivingOrderToCourier?: boolean;
  onCollapse: () => void;
  onCancel: (order: Order) => void;
  onConfirm: (order: Order) => void;
  onStartControl: (order: Order) => void;
  onGiveToCourier: (order: Order) => void;
  onPrint: (order: Order) => void;
  isPrinting?: boolean;
  order: Order;
};

function OrderCardComponent({
  isCancelling = false,
  isCompleting = false,
  isConfirming = false,
  isOpening = false,
  isGivingOrderToCourier = false,
  onCollapse,
  onCancel,
  onConfirm,
  onStartControl,
  onGiveToCourier,
  onPrint,
  isPrinting = false,
  order
}: OrderCardProps) {
  const tone = getOrderTone(order);
  const isConfirmation = isOrderAwaitingConfirmation(order);
  const isReady = isOrderReady(order);
  const isTransferredToCourier = isOrderTransferredToCourier(order);
  const assembleBefore = useMemo(
    () => formatOrderTime(order.order_created_at),
    [order.order_created_at]
  );

  function handlePrimaryAction(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (isReady) onGiveToCourier(order);
    else if (isConfirmation) onConfirm(order);
    else onStartControl(order);
  }

  function handleCancel(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onCancel(order);
  }

  function handlePrint(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onPrint(order);
  }

  const isActionPending = isCancelling || isCompleting || isConfirming || isOpening || isGivingOrderToCourier || isPrinting;

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
      <OrderStatusBadge order={order} tone={tone} />
      <OrderMeta assembleBefore={assembleBefore} className="mt-2" order={order} />

      {isTransferredToCourier ? (
        <div className="order-card-actions mt-3 border-t pt-3">
          <button
            className="order-primary-button min-h-[2.125rem] w-full rounded-lg bg-blue-600 text-xs font-extrabold text-white disabled:cursor-wait disabled:opacity-60"
            disabled={isActionPending}
            type="button"
            onClick={handlePrint}
          >
            {isPrinting ? "..." : "Печать"}
          </button>
        </div>
      ) : (
      <div className="order-card-actions mt-3 grid grid-cols-2 gap-2 border-t pt-3">
        <button
          className="order-cancel-button min-h-[2.125rem] rounded-lg border border-slate-300 app-surface text-xs font-extrabold disabled:cursor-wait disabled:opacity-60"
          disabled={isActionPending}
          type="button"
          onClick={handleCancel}
        >
          {isCancelling ? "..." : "Отмена"}
        </button>
        <button
          className="order-primary-button min-h-[2.125rem] rounded-lg bg-emerald-600 text-xs font-extrabold text-white"
          disabled={isActionPending}
          type="button"
          onClick={handlePrimaryAction}
        >
          {isOpening || isConfirming || isCompleting || isGivingOrderToCourier
            ? "..."
            : isReady
              ? "Выдать"
              : isConfirmation
              ? "Подтвердить заказ"
              : "Собрать"}
        </button>
      </div>
      )}
    </article>
  );
}

export const OrderCard = memo(OrderCardComponent);
