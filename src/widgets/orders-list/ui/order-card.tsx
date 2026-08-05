"use client";

import { memo, useMemo, useState, type MouseEvent } from "react";
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
import { LoadingDots } from "@/shared/ui/loading-dots";
import { Dialog } from "@/shared/ui/dialog";

type OrderCardProps = {
  isCancelling?: boolean;
  isCompleting?: boolean;
  isConfirming?: boolean;
  isOpening?: boolean;
  isGivingOrderToCourier?: boolean;
  isSelectionLocked?: boolean;
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
  isSelectionLocked = false,
  onCollapse,
  onCancel,
  onConfirm,
  onStartControl,
  onGiveToCourier,
  onPrint,
  isPrinting = false,
  order
}: OrderCardProps) {
  const [isCancelConfirmationOpen, setIsCancelConfirmationOpen] = useState(false);
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
    setIsCancelConfirmationOpen(true);
  }

  function confirmCancel() {
    setIsCancelConfirmationOpen(false);
    onCancel(order);
  }

  function handlePrint(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onPrint(order);
  }

  const isActionPending = isCancelling || isCompleting || isConfirming || isOpening || isGivingOrderToCourier || isPrinting;

  return (
    <article
      aria-disabled={isSelectionLocked}
      className={`order-full-card order-full-card-${tone} w-full rounded-xl border-2 border-blue-500 app-surface-muted p-2.5`}
      role="button"
      tabIndex={isSelectionLocked ? -1 : 0}
      onClick={() => {
        if (!isSelectionLocked) onCollapse();
      }}
      onKeyDown={(event) => {
        if (!isSelectionLocked && (event.key === "Enter" || event.key === " ")) {
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
            {isPrinting ? <LoadingDots label="Печать" /> : "Печать"}
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
          {isCancelling ? <LoadingDots label="Отмена заказа" /> : "Отмена"}
        </button>
        <button
          className="order-primary-button min-h-[2.125rem] rounded-lg bg-emerald-600 text-xs font-extrabold text-white"
          disabled={isActionPending}
          type="button"
          onClick={handlePrimaryAction}
        >
          {isOpening || isConfirming || isCompleting || isGivingOrderToCourier
            ? <LoadingDots label="Обработка заказа" />
            : isReady
              ? "Выдать"
              : isConfirmation
              ? "Подтвердить заказ"
              : "Собрать"}
        </button>
      </div>
      )}

      {isCancelConfirmationOpen ? (
        <Dialog
          ariaLabelledBy={`cancel-order-title-${order.id}`}
          className="w-full max-w-sm rounded-2xl app-surface p-5 shadow-2xl"
          onClose={() => setIsCancelConfirmationOpen(false)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <h2
              className="text-lg font-extrabold app-text"
              id={`cancel-order-title-${order.id}`}
            >
              Отменить заказ?
            </h2>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-300 app-surface px-4 py-2 text-sm font-bold app-text transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="button"
                onClick={() => setIsCancelConfirmationOpen(false)}
              >
                Нет
              </button>
              <button
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                type="button"
                onClick={confirmCancel}
              >
                Да
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </article>
  );
}

export const OrderCard = memo(OrderCardComponent);
