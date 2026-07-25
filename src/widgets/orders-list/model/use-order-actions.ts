"use client";

import { useCallback, useState } from "react";
import {
  clearStoredOrderControl,
  type Order
} from "@/entities/order";
import type { Seller } from "@/entities/seller";
import type { PageNotificationTone } from "@/shared/ui/page-notification";
import { completeOrder, confirmOrder } from "../api/orders";

type Notify = (
  title: string,
  body: string,
  tone: PageNotificationTone
) => void;

type Options = {
  currentSeller: Seller | null;
  notify: Notify;
  onCompleteSuccess: (order: Order) => void;
  refresh: () => void;
};

export function useOrderActions({
  currentSeller,
  notify,
  onCompleteSuccess,
  refresh
}: Options) {
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);

  const requireSeller = useCallback(() => {
    if (currentSeller !== null) return currentSeller;
    notify(
      "Не выбран продавец!",
      "Нажмите на кнопку выбора продавца и отсканируйте штрихкод на бейдже.",
      "error"
    );
    return null;
  }, [currentSeller, notify]);

  const confirm = useCallback(async (order: Order) => {
    const seller = requireSeller();
    if (seller === null) return;
    setConfirmingOrderId(order.id);

    try {
      const result = await confirmOrder({
        orderId: order.uid_1c,
        seller: seller.userId
      });
      notify(
        "Управление заказами",
        result.status === 200
          ? "Заказ успешно подтвержден"
          : `При подтверждении заказа произошла ошибка: ${result.data.mess}, статус заказа: ${result.data.data.status}`,
        result.status === 200 ? "success" : "warning"
      );
      if (result.status === 200 || result.status === 400) refresh();
    } catch {
      notify(
        "Ошибка подтверждения",
        "Не удалось получить ответ сервера, статус заказа: неизвестен",
        "warning"
      );
    } finally {
      setConfirmingOrderId(null);
    }
  }, [notify, refresh, requireSeller]);

  const complete = useCallback(async (order: Order) => {
    if (order.items.every((item) => item.quantity_fact === 0)) {
      notify("Управление заказами", "Не отсканирован ни один товар!", "warning");
      return;
    }
    const seller = requireSeller();
    if (seller === null) return;
    setCompletingOrderId(order.id);

    try {
      const result = await completeOrder({
        orderId: order.uid_1c,
        seller: seller.userId,
        orderControlledItem: order.controlledItems.map(
          ({ product_id, product_name, quantity, mark }) => ({
            product_id,
            product_name,
            quantity,
            mark
          })
        )
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
      }
      if (result.status === 200 || result.status === 400) refresh();
    } catch {
      notify(
        "Ошибка завершения контроля",
        "Не удалось получить ответ сервера, статус заказа: неизвестен",
        "warning"
      );
    } finally {
      setCompletingOrderId(null);
    }
  }, [notify, onCompleteSuccess, refresh, requireSeller]);

  return { complete, completingOrderId, confirm, confirmingOrderId };
}
