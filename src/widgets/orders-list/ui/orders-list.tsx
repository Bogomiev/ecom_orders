"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  restoreOrderControl,
  saveOrderControl,
  type Order
} from "@/entities/order";
import type { ProductsResponse } from "@/entities/product";
import { useCurrentSeller } from "@/entities/seller";
import { PageNotificationStack, type PageNotification } from "@/shared/ui/page-notification";
import { usePageNotifications } from "@/shared/lib/use-page-notifications";
import {
  useHasAccessToken,
  useSelectedStore
} from "@/entities/store";
import { enrichOrder } from "../api/orders";
import { OrderCard } from "./order-card";
import { OrderCardMini } from "./order-card-mini";
import { useProductsCache } from "../model/use-products-cache";
import { useOrders } from "../model/use-orders";
import { useOrderActions } from "../model/use-order-actions";

type OrdersListProps = {
  layout?: "grid" | "list";
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
  onOrdersCountChange
}: OrdersListProps = {}) {
  const selectedStore = useSelectedStore();
  const currentSeller = useCurrentSeller();
  const [controlOrder, setControlOrder] = useState<Order | null>(null);
  const hasAccessToken = useHasAccessToken();
  const [controlProducts, setControlProducts] = useState<ProductsResponse>([]);
  const [controlLoadError, setControlLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);
  const { dismiss, notifications, notify } = usePageNotifications();
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [visibleOrdersLimit, setVisibleOrdersLimit] = useState(ORDERS_BATCH_SIZE);
  const isMountedRef = useRef(true);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const controlledOrdersRef = useRef(new Map<string, Order>());
  const getProductsForControl = useProductsCache();
  const { setState, state } = useOrders({
    controlledOrdersRef,
    refreshKey: ordersRefreshKey,
    setControlOrder
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      const products = await getProductsForControl();

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
  }, [getProductsForControl, setState]);

  const showOrderNotification = useCallback(
    (title: string, body: string, tone: PageNotification["tone"]) => {
      notify({ title, body, tone });
    },
    [notify]
  );
  const refreshOrders = useCallback(
    () => setOrdersRefreshKey((current) => current + 1),
    []
  );
  const handleCompleteSuccess = useCallback((order: Order) => {
    controlledOrdersRef.current.delete(order.id);
    setControlOrder(null);
  }, []);
  const {
    complete: handleCompleteOrder,
    completingOrderId,
    confirm: handleConfirmOrder,
    confirmingOrderId
  } = useOrderActions({
    currentSeller,
    notify: showOrderNotification,
    onCompleteSuccess: handleCompleteSuccess,
    refresh: refreshOrders
  });

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
                  isConfirming={confirmingOrderId === order.id}
                  isOpening={openingOrderId === order.id}
                  order={order}
                  onCollapse={() => setExpandedOrderId(null)}
                  onConfirm={handleConfirmOrder}
                  onStartControl={openOrderControl}
                />
              ) : (
                <OrderCardMini
                  key={order.id}
                  disabled={!hasAccessToken}
                  order={order}
                  onOpen={(selectedOrder) =>
                    hasAccessToken && setExpandedOrderId(selectedOrder.id)
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
      <PageNotificationStack
        notifications={notifications}
        onClose={dismiss}
      />
    </section>
  );
}
