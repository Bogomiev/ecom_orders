"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  clearStoredOrderControl,
  ConfirmOrderItemAction,
  type Order
} from "@/entities/order";
import { getStoredCurrentSeller } from "@/entities/seller";
import type { PageNotificationTone } from "@/shared/ui/page-notification";
import {
  cancelOrder,
  completeOrder,
  confirmOrder,
  giveOrderToCourier as requestGiveOrderToCourier
} from "../api/orders";
import { getCompleteOrderItems } from "./complete-order-items";

type Notify = (
  title: string,
  body: ReactNode,
  tone: PageNotificationTone
) => void;

type Options = {
  notify: Notify;
  onCompleteSuccess: (order: Order) => void;
  refresh: (onFailure: () => void) => void;
};

export function requireCurrentSeller(notify: Notify) {
  const currentSeller = getStoredCurrentSeller();
  if (currentSeller !== null) return currentSeller;

  notify(
    "Не выбран продавец!",
    "Нажмите на кнопку выбора продавца и отсканируйте штрихкод на бейдже.",
    "error"
  );
  return null;
}

export function useOrderActions({
  notify,
  onCompleteSuccess,
  refresh
}: Options) {
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [givingOrderToCourierId, setGivingOrderToCourierId] = useState<string | null>(null);
  const clearCancellingOrder = useCallback(
    () => setCancellingOrderId(null),
    []
  );
  const clearConfirmingOrder = useCallback(
    () => setConfirmingOrderId(null),
    []
  );
  const clearCompletingOrder = useCallback(
    () => setCompletingOrderId(null),
    []
  );
  const clearGivingOrderToCourier = useCallback(
    () => setGivingOrderToCourierId(null),
    []
  );

  const requireSeller = useCallback(
    () => requireCurrentSeller(notify),
    [notify]
  );

  const confirm = useCallback(async (
    order: Order,
    pendingCancellationProductIds: ReadonlySet<string> = new Set()
  ) => {
    const seller = requireSeller();
    if (seller === null) return false;
    setConfirmingOrderId(order.id);
    let isWaitingForRefresh = false;

    try {
      const result = await confirmOrder({
        orderId: order.uid_1c,
        seller: seller.userId,
        items: order.items.map((item) => ({
          product_id: item.product_id,
          action: item.canceled || pendingCancellationProductIds.has(item.product_id)
            ? ConfirmOrderItemAction.CANCELLED
            : ConfirmOrderItemAction.CONFIRMED
        }))
      });
      notify(
        "Управление заказами",
        result.status === 200
          ? "Заказ успешно подтвержден"
          : `При подтверждении заказа произошла ошибка: ${result.data.mess}, статус заказа: ${result.data.data.status}`,
        result.status === 200 ? "success" : "warning"
      );
      if (result.status === 200 || result.status === 400) {
        isWaitingForRefresh = true;
        refresh(clearConfirmingOrder);
      }
      return result.status === 200;
    } catch {
      notify(
        "Ошибка подтверждения",
        "Не удалось получить ответ сервера, статус заказа: неизвестен",
        "warning"
      );
      return false;
    } finally {
      if (!isWaitingForRefresh) {
        clearConfirmingOrder();
      }
    }
  }, [clearConfirmingOrder, notify, refresh, requireSeller]);

  const cancel = useCallback(async (order: Order) => {
    const seller = requireSeller();
    if (seller === null) return;
    setCancellingOrderId(order.id);
    let isWaitingForRefresh = false;

    try {
      const result = await cancelOrder({
        orderId: order.uid_1c,
        seller: seller.userId
      });
      notify(
        "Управление заказами",
        result.status === 200
          ? "Заказ успешно отменен"
          : `При отмене заказа произошла ошибка: ${result.data.mess}, статус заказа: ${result.data.data.status}`,
        result.status === 200 ? "success" : "warning"
      );
      if (result.status === 200 || result.status === 400) {
        isWaitingForRefresh = true;
        refresh(clearCancellingOrder);
      }
    } catch {
      notify(
        "Ошибка отмены",
        "Не удалось получить ответ сервера, статус заказа: неизвестен",
        "warning"
      );
    } finally {
      if (!isWaitingForRefresh) {
        clearCancellingOrder();
      }
    }
  }, [clearCancellingOrder, notify, refresh, requireSeller]);

  const giveOrderToCourier = useCallback(async (order: Order) => {
    const seller = requireSeller();
    if (seller === null) return;
    setGivingOrderToCourierId(order.id);
    let isWaitingForRefresh = false;

    try {
      const result = await requestGiveOrderToCourier({
        orderId: order.uid_1c,
        seller: seller.userId
      });
      notify(
        "Управление заказами",
        result.status === 200
          ? order.deliveryMethod === "delivery"
            ? "Заказ успешно передан курьеру"
            : "Заказ успешно передан покупателю"
          : order.deliveryMethod === "delivery"
            ? `При выдаче заказа курьеру произошла ошибка: ${result.data.mess}, статус заказа: ${result.data.data.status}`
            : `При выдаче заказа покупателю произошла ошибка: ${result.data.mess}, статус заказа: ${result.data.data.status}`,
        result.status === 200 ? "success" : "warning"
      );
      if (result.status === 200) {
        isWaitingForRefresh = true;
        refresh(clearGivingOrderToCourier);
      }
    } catch {
      notify(
        order.deliveryMethod === "delivery"
          ? "Ошибка выдачи заказа курьеру"
          : "Ошибка передачи заказа покупателю",
        "Не удалось получить ответ сервера, статус заказа: неизвестен",
        "warning"
      );
    } finally {
      if (!isWaitingForRefresh) {
        clearGivingOrderToCourier();
      }
    }
  }, [clearGivingOrderToCourier, notify, refresh, requireSeller]);

  const complete = useCallback(async (order: Order) => {
    if (order.quantityBags <= 0) {
      notify("Предупреждение", "Укажите количество пакетов", "warning");
      return;
    }
    if (order.items.every((item) => item.quantity_fact === 0)) {
      notify("Управление заказами", "Не отсканирован ни один товар!", "warning");
      return;
    }
    const seller = requireSeller();
    if (seller === null) return;
    setCompletingOrderId(order.id);
    let isWaitingForRefresh = false;

    try {
      const result = await completeOrder({
        orderId: order.uid_1c,
        seller: seller.userId,
        quantityBags: order.quantityBags,
        orderControlledItem: getCompleteOrderItems(order)
      });
      notify(
        "Управление заказами",
        result.status === 200
          ? "Заказ успешно собран"
          : `При сборке заказа произошла ошибка: ${result.data.mess}, статус заказа: ${result.data.data.status}`,
        result.status === 200 ? "success" : "warning"
      );
      if (result.status === 200) {
        clearStoredOrderControl(order);
        onCompleteSuccess(order);
        isWaitingForRefresh = true;
        refresh(clearCompletingOrder);
      }
    } catch {
      notify(
        "Ошибка завершения контроля",
        "Не удалось получить ответ сервера, статус заказа: неизвестен",
        "warning"
      );
    } finally {
      if (!isWaitingForRefresh) {
        clearCompletingOrder();
      }
    }
  }, [clearCompletingOrder, notify, onCompleteSuccess, refresh, requireSeller]);

  return {
    cancel,
    cancellingOrderId,
    clearCancellingOrder,
    clearCompletingOrder,
    clearConfirmingOrder,
    clearGivingOrderToCourier,
    complete,
    completingOrderId,
    confirm,
    confirmingOrderId,
    giveOrderToCourier,
    givingOrderToCourierId
  };
}
