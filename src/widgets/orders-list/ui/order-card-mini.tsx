"use client";

import { memo, useMemo, useState, type MouseEvent } from "react";
import {
  formatOrderTime,
  getMarketplaceLabel,
  getOrderStatusLabel,
  getOrderTone,
  isOrderAwaitingConfirmation,
  isOrderReady,
  isOrderTransferredToCourier,
  isOrderUnavailableForOpening,
  type Order
} from "@/entities/order";
import {
  OrderCardHeader,
  OrderMeta,
  OrderStatusBadge
} from "./order-card-parts";
import { Dialog } from "@/shared/ui/dialog";
import { LoadingDots } from "@/shared/ui/loading-dots";

type OrderCardMiniProps = {
  disabled?: boolean;
  isCancelling?: boolean;
  isCompleting?: boolean;
  isConfirming?: boolean;
  isGivingOrderToCourier?: boolean;
  isOpening?: boolean;
  isPrinting?: boolean;
  onCancel: (order: Order) => void;
  onConfirm: (order: Order) => void;
  onGiveToCourier: (order: Order) => void;
  onOpen: (order: Order) => void;
  onPrint: (order: Order) => void;
  onStartControl: (order: Order) => void;
  onView: (order: Order) => void;
  order: Order;
};

function OrderCardMiniComponent({
  disabled = false,
  isCancelling = false,
  isCompleting = false,
  isConfirming = false,
  isGivingOrderToCourier = false,
  isOpening = false,
  isPrinting = false,
  onCancel,
  onConfirm,
  onGiveToCourier,
  onOpen,
  onPrint,
  onStartControl,
  onView,
  order
}: OrderCardMiniProps) {
  const [isCancelConfirmationOpen, setIsCancelConfirmationOpen] = useState(false);
  const tone = getOrderTone(order);
  const statusLabel = getOrderStatusLabel(order);
  const cannotOpen = isOrderUnavailableForOpening(order);
  const assembleBefore = useMemo(
    () => formatOrderTime(order.order_created_at),
    [order.order_created_at]
  );
  const marketplace = getMarketplaceLabel(order.source);
  const isConfirmation = isOrderAwaitingConfirmation(order);
  const isReady = isOrderReady(order);
  const isTransferredToCourier = isOrderTransferredToCourier(order);
  const isActionPending = isCancelling || isCompleting || isConfirming ||
    isGivingOrderToCourier || isOpening || isPrinting;
  const areActionsDisabled = disabled || isActionPending || cannotOpen;

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

  function handlePrint(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onPrint(order);
  }

  return (
    <article
      aria-label={`${marketplace}, заказ ${order.number}${order.external_id ? ` / ${order.external_id}` : ""}, ${statusLabel}`}
      aria-disabled={disabled || isActionPending || cannotOpen}
      className="order-mini-card w-full rounded-xl border app-border app-surface-muted p-2.5 text-left transition-[border-color,box-shadow] hover:border-slate-400 hover:shadow-[0_0_0_1px_#c5cfde] aria-disabled:cursor-wait aria-disabled:opacity-70"
      role="button"
      tabIndex={disabled || isActionPending || cannotOpen ? -1 : 0}
      onClick={() => {
        if (!disabled && !isActionPending && !cannotOpen) onOpen(order);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (!disabled && !isActionPending && !cannotOpen && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen(order);
        }
      }}
    >
      <OrderCardHeader order={order} onView={onView} />
      <OrderStatusBadge order={order} tone={tone} />
      <OrderMeta assembleBefore={assembleBefore} order={order} />

      {isTransferredToCourier ? (
        <div className="order-card-actions mt-3 border-t pt-3">
          <button className="order-primary-button min-h-[2.125rem] w-full rounded-lg bg-blue-600 text-xs font-extrabold text-white disabled:cursor-wait disabled:opacity-60" disabled={areActionsDisabled} type="button" onClick={handlePrint}>
            {isPrinting ? <LoadingDots label="Печать" /> : "Печать"}
          </button>
        </div>
      ) : (
        <div className="order-card-actions mt-3 grid grid-cols-2 gap-2 border-t pt-3">
          <button className="order-cancel-button min-h-[2.125rem] rounded-lg border border-slate-300 app-surface text-xs font-extrabold disabled:cursor-wait disabled:opacity-60" disabled={areActionsDisabled} type="button" onClick={handleCancel}>
            {isCancelling ? <LoadingDots label="Отмена заказа" /> : "Отмена"}
          </button>
          <button className="order-primary-button min-h-[2.125rem] rounded-lg bg-emerald-600 text-xs font-extrabold text-white disabled:cursor-wait disabled:opacity-60" disabled={areActionsDisabled} type="button" onClick={handlePrimaryAction}>
            {isActionPending
              ? <LoadingDots label="Обработка заказа" />
              : isReady ? "Выдать" : isConfirmation ? "Подтвердить заказ" : "Собрать"}
          </button>
        </div>
      )}

      {isCancelConfirmationOpen ? (
        <Dialog ariaLabelledBy={`cancel-mini-order-title-${order.id}`} className="w-full max-w-sm rounded-2xl app-surface p-5 shadow-2xl" onClose={() => setIsCancelConfirmationOpen(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-extrabold app-text" id={`cancel-mini-order-title-${order.id}`}>Отменить заказ?</h2>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-xl border border-slate-300 app-surface px-4 py-2 text-sm font-bold app-text" type="button" onClick={() => setIsCancelConfirmationOpen(false)}>Нет</button>
              <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white" type="button" onClick={() => { setIsCancelConfirmationOpen(false); onCancel(order); }}>Да</button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </article>
  );
}

export const OrderCardMini = memo(OrderCardMiniComponent);
