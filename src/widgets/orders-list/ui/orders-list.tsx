"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isOrderAwaitingAssembly,
  isOrderAwaitingConfirmation,
  isOrderReady,
  isOrderRequiringAttention,
  isOrderUnavailableForOpening,
  restoreOrderControl,
  saveOrderControl,
  type Order
} from "@/entities/order";
import type { ProductsResponse } from "@/entities/product";
import { PageNotificationStack, type PageNotification } from "@/shared/ui/page-notification";
import { PdfDialog } from "@/shared/ui/pdf-dialog";
import { usePageNotifications } from "@/shared/lib/use-page-notifications";
import {
  useHasAccessToken,
  useSelectedStore
} from "@/entities/store";
import { OrderCard } from "./order-card";
import { OrderCardMini } from "./order-card-mini";
import { useProductsCache } from "../model/use-products-cache";
import { useOrders } from "../model/use-orders";
import {
  requireCurrentSeller,
  useOrderActions
} from "../model/use-order-actions";
import {
  enrichOrder,
  getMissingOrderProductIds
} from "../model/order-products";
import { printOrder } from "../api/orders";

type OrdersListProps = {
  layout?: "grid" | "list";
  onNotificationOrdersCountChange?: (ordersCount: number) => void;
  onOrdersCountChange?: (ordersCount: number) => void;
};

const ORDERS_BATCH_SIZE = 20;

const OrderControl = dynamic(
  () => import("@/features/orders").then((module) => module.OrderControl),
  {
    ssr: false
  }
);

export function OrdersList({
  layout = "grid",
  onNotificationOrdersCountChange,
  onOrdersCountChange
}: OrdersListProps = {}) {
  const selectedStore = useSelectedStore();
  const [controlOrder, setControlOrder] = useState<Order | null>(null);
  const hasAccessToken = useHasAccessToken();
  const [controlProducts, setControlProducts] = useState<ProductsResponse>([]);
  const [controlLoadError, setControlLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [printPdf, setPrintPdf] = useState<{ base64: string; title: string } | null>(null);
  const { dismiss, notifications, notify } = usePageNotifications();
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const ordersRefreshKeyRef = useRef(0);
  const refreshFailureCallbacksRef = useRef(new Map<number, () => void>());
  const [visibleOrdersLimit, setVisibleOrdersLimit] = useState(ORDERS_BATCH_SIZE);
  const isMountedRef = useRef(true);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const controlledOrdersRef = useRef(new Map<string, Order>());
  const { getProducts, refreshProducts, retryProducts } = useProductsCache();
  const handleOrdersRefreshResult = useCallback(
    (refreshKey: number, succeeded: boolean) => {
      const onFailure = refreshFailureCallbacksRef.current.get(refreshKey);
      if (onFailure === undefined) return;

      refreshFailureCallbacksRef.current.delete(refreshKey);
      if (!succeeded) onFailure();
    },
    []
  );
  const { setState, state } = useOrders({
    controlledOrdersRef,
    onRefreshResult: handleOrdersRefreshResult,
    refreshKey: ordersRefreshKey,
    setControlOrder,
    storeId: selectedStore?.id
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void getProducts().catch(() => {
      // Ошибка фоновой загрузки будет показана, если пользователь откроет контроль.
    });
  }, [getProducts]);

  const filteredOrders = useMemo(() => {
    const orders = state.data?.items ?? [];

    if (selectedStore === null) {
      return orders;
    }

    return orders.filter(
      (order) => order.store_id === selectedStore.id
    );
  }, [selectedStore, state.data]);
  const ordersCount = filteredOrders.length;
  const notificationOrdersCount = useMemo(
    () => filteredOrders.filter(isOrderRequiringAttention).length,
    [filteredOrders]
  );
  const visibleOrders = useMemo(
    () => filteredOrders.slice(0, visibleOrdersLimit),
    [filteredOrders, visibleOrdersLimit]
  );
  const hasMoreOrders = visibleOrders.length < filteredOrders.length;
  const ordersGridClassName =
    layout === "list"
      ? "grid gap-2.5"
      : "grid gap-4 md:grid-cols-2 xl:grid-cols-4";

  const loadNextOrders = useCallback(() => {
    setVisibleOrdersLimit((currentLimit) =>
      Math.min(currentLimit + ORDERS_BATCH_SIZE, filteredOrders.length)
    );
  }, [filteredOrders.length]);

  useEffect(() => {
    if (!hasMoreOrders) {
      return;
    }

    const trigger = loadMoreTriggerRef.current;

    if (trigger === null || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadNextOrders();
        }
      },
      {
        rootMargin: "240px 0px"
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreOrders, loadNextOrders]);

  useEffect(() => {
    onOrdersCountChange?.(ordersCount);
  }, [onOrdersCountChange, ordersCount]);

  useEffect(() => {
    onNotificationOrdersCountChange?.(notificationOrdersCount);
  }, [notificationOrdersCount, onNotificationOrdersCountChange]);

  function updateControlledOrder(nextOrder: Order) {
    saveOrderControl(nextOrder);
    controlledOrdersRef.current.set(nextOrder.id, nextOrder);
    setControlOrder(nextOrder);
    setState((currentState) => {
      if (currentState.data === null) {
        return currentState;
      }

      return {
        ...currentState,
        data: {
          ...currentState.data,
          items: currentState.data.items.map((order) =>
            order.id === nextOrder.id ? nextOrder : order
          )
        }
      };
    });
  }

  const openOrderControl = useCallback(async (order: Order) => {
    setControlLoadError(null);
    setOpeningOrderId(order.id);

    try {
      let products = await getProducts();

      if (getMissingOrderProductIds(order, products).length > 0) {
        try {
          products = await refreshProducts();
        } catch {
          products = await retryProducts();
        }
      }

      if (!isMountedRef.current) {
        return;
      }

      const enrichedOrder = restoreOrderControl(enrichOrder(order, products));
      controlledOrdersRef.current.set(enrichedOrder.id, enrichedOrder);
      setControlProducts(products);
      setControlOrder(enrichedOrder);
      setState((currentState) => {
        if (currentState.data === null) {
          return currentState;
        }

        return {
          ...currentState,
          data: {
            ...currentState.data,
            items: currentState.data.items.map((currentOrder) =>
              currentOrder.id === enrichedOrder.id ? enrichedOrder : currentOrder
            )
          }
        };
      });
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setControlLoadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить список товаров"
      );
    } finally {
      if (isMountedRef.current) {
        setOpeningOrderId(null);
      }
    }
  }, [getProducts, refreshProducts, retryProducts, setState]);

  const showOrderNotification = useCallback(
    (title: string, body: string, tone: PageNotification["tone"]) => {
      notify({ title, body, tone });
    },
    [notify]
  );
  const refreshOrders = useCallback((onFailure: () => void) => {
    const nextRefreshKey = ordersRefreshKeyRef.current + 1;
    ordersRefreshKeyRef.current = nextRefreshKey;
    refreshFailureCallbacksRef.current.set(nextRefreshKey, onFailure);
    setOrdersRefreshKey(nextRefreshKey);
  }, []);
  const handleCompleteSuccess = useCallback((order: Order) => {
    controlledOrdersRef.current.delete(order.id);
    setControlOrder(null);
  }, []);
  const {
    cancel: handleCancelOrder,
    cancellingOrderId,
    clearCancellingOrder,
    clearCompletingOrder,
    clearConfirmingOrder,
    clearGivingOrderToCourier,
    complete: handleCompleteOrder,
    completingOrderId,
    confirm: handleConfirmOrder,
    confirmingOrderId,
    giveOrderToCourier: handleGiveOrderToCourier,
    givingOrderToCourierId
  } = useOrderActions({
    notify: showOrderNotification,
    onCompleteSuccess: handleCompleteSuccess,
    refresh: refreshOrders
  });
  const isOrderSelectionLocked =
    cancellingOrderId !== null ||
    completingOrderId !== null ||
    confirmingOrderId !== null ||
    givingOrderToCourierId !== null ||
    openingOrderId !== null ||
    printingOrderId !== null;
  useEffect(() => {
    if (confirmingOrderId === null || state.data === null) return;

    const confirmingOrder = state.data.items.find(
      (order) => order.id === confirmingOrderId
    );
    if (
      confirmingOrder === undefined ||
      !isOrderAwaitingConfirmation(confirmingOrder)
    ) {
      clearConfirmingOrder();
    }
  }, [
    clearConfirmingOrder,
    confirmingOrderId,
    state.data
  ]);
  useEffect(() => {
    if (givingOrderToCourierId === null || state.data === null) return;

    const order = state.data.items.find(
      (currentOrder) => currentOrder.id === givingOrderToCourierId
    );
    if (order === undefined || !isOrderReady(order)) {
      clearGivingOrderToCourier();
    }
  }, [
    clearGivingOrderToCourier,
    givingOrderToCourierId,
    state.data
  ]);
  useEffect(() => {
    if (state.data === null) return;

    if (cancellingOrderId !== null) {
      const cancellingOrder = state.data.items.find(
        (order) => order.id === cancellingOrderId
      );
      if (
        cancellingOrder === undefined ||
        isOrderUnavailableForOpening(cancellingOrder)
      ) {
        clearCancellingOrder();
      }
    }
    if (completingOrderId !== null) {
      const completingOrder = state.data.items.find(
        (order) => order.id === completingOrderId
      );
      if (
        completingOrder === undefined ||
        !isOrderAwaitingAssembly(completingOrder)
      ) {
        clearCompletingOrder();
      }
    }
  }, [
    cancellingOrderId,
    clearCancellingOrder,
    clearCompletingOrder,
    completingOrderId,
    state.data
  ]);
  const handleStartControl = useCallback(
    (order: Order) => {
      if (requireCurrentSeller(showOrderNotification) === null) return;
      void openOrderControl(order);
    },
    [openOrderControl, showOrderNotification]
  );
  const handlePrintOrder = useCallback(async (order: Order) => {
    setPrintingOrderId(order.id);
    try {
      const base64 = await printOrder(order.uid_1c);
      if (!base64) throw new Error("Сервер вернул пустую печатную форму");
      setPrintPdf({ base64, title: `Заказ ${order.number}` });
    } catch (error) {
      showOrderNotification(
        "Ошибка печати",
        error instanceof Error ? error.message : "Не удалось получить печатную форму",
        "warning"
      );
    } finally {
      if (isMountedRef.current) setPrintingOrderId(null);
    }
  }, [showOrderNotification]);

  return (
    <section className="space-y-3">
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      ) : null}

      {controlLoadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {controlLoadError}
        </div>
      ) : null}

      {state.isLoading ? (
        <div className="rounded-lg border app-border app-surface px-4 py-8 text-center text-sm app-muted">
          Загружаем заказы...
        </div>
      ) : null}

      {!state.isLoading && filteredOrders.length === 0 ? (
        <div className="rounded-lg border app-border app-surface px-4 py-2 text-center text-sm app-muted">
          Заказов пока нет
        </div>
      ) : null}

      {filteredOrders.length > 0 ? (
        <>
          <div className={ordersGridClassName}>
            {visibleOrders.map((order) =>
              expandedOrderId === order.id ? (
                <OrderCard
                  key={order.id}
                  isCancelling={cancellingOrderId === order.id}
                  isCompleting={completingOrderId === order.id}
                  isConfirming={confirmingOrderId === order.id}
                  isOpening={openingOrderId === order.id}
                  isGivingOrderToCourier={givingOrderToCourierId === order.id}
                  isPrinting={printingOrderId === order.id}
                  isSelectionLocked={isOrderSelectionLocked}
                  order={order}
                  onCancel={handleCancelOrder}
                  onCollapse={() => setExpandedOrderId(null)}
                  onConfirm={handleConfirmOrder}
                  onStartControl={handleStartControl}
                  onGiveToCourier={handleGiveOrderToCourier}
                  onPrint={handlePrintOrder}
                />
              ) : (
                <OrderCardMini
                  key={order.id}
                  disabled={!hasAccessToken || isOrderSelectionLocked}
                  order={order}
                  onOpen={(selectedOrder) =>
                    hasAccessToken &&
                    !isOrderSelectionLocked &&
                    !isOrderUnavailableForOpening(selectedOrder) &&
                    setExpandedOrderId(selectedOrder.id)
                  }
                />
              )
            )}
          </div>

          {hasMoreOrders ? (
            <div
              ref={loadMoreTriggerRef}
              aria-hidden="true"
              className="h-1"
            />
          ) : null}
        </>
      ) : null}

      <OrderControl
        isOpen={controlOrder !== null}
        isCompleting={completingOrderId === controlOrder?.id}
        order={controlOrder}
        products={controlProducts}
        onOrderChange={updateControlledOrder}
        onComplete={handleCompleteOrder}
        onClose={() => setControlOrder(null)}
      />
      {printPdf ? (
        <PdfDialog
          base64={printPdf.base64}
          title={printPdf.title}
          onClose={() => setPrintPdf(null)}
        />
      ) : null}
      <PageNotificationStack
        notifications={notifications}
        onClose={dismiss}
      />
    </section>
  );
}
