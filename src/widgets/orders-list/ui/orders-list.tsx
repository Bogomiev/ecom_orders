"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearStoredOrderControl,
  restoreOrderControl,
  saveOrderControl,
  type Order,
  type OrderControlledItem,
  type OrderItem,
  type OrdersResponse
} from "@/entities/order";
import type { ProductsResponse } from "@/entities/product";
import { getStoredCurrentSeller } from "@/entities/seller";
import {
  PageNotificationStack,
  type PageNotification
} from "@/shared/ui/page-notification";
import {
  getStoredStoreSelection,
  getAccessTokenFromLocation,
  STORE_SELECTION_CHANGE_EVENT,
  type StoreSelectionSnapshot
} from "@/entities/store";
import {
  enrichOrder,
  completeOrder,
  confirmOrder,
  fetchProducts,
  fetchOrders,
  ORDERS_REFRESH_INTERVAL_SECONDS
} from "../api/orders";
import { OrderCard } from "./order-card";
import { OrderCardMini } from "./order-card-mini";

type OrdersState = {
  data: OrdersResponse | null;
  error: string | null;
  isLoading: boolean;
  lastUpdatedAt: Date | null;
};

type ProductsCache = {
  loadedAt: number;
  products: ProductsResponse;
};

type OrdersListProps = {
  layout?: "grid" | "list";
  onOrdersCountChange?: (ordersCount: number) => void;
};

const initialState: OrdersState = {
  data: null,
  error: null,
  isLoading: true,
  lastUpdatedAt: null
};

const PRODUCTS_CACHE_TTL_MS = 15 * 60 * 1000;
const ORDERS_BATCH_SIZE = 20;

const OrderControl = dynamic(
  () => import("@/features/orders").then((module) => module.OrderControl),
  {
    ssr: false
  }
);

function isSameOrderItem(currentItem: OrderItem, nextItem: OrderItem) {
  return (
    currentItem.product_id === nextItem.product_id &&
    currentItem.product_name === nextItem.product_name &&
    currentItem.marking_product === nextItem.marking_product &&
    currentItem.quantity === nextItem.quantity &&
    currentItem.price === nextItem.price &&
    currentItem.amount === nextItem.amount &&
    currentItem.quantity_fact === nextItem.quantity_fact &&
    currentItem.is_weight === nextItem.is_weight
  );
}

function isSameControlledItem(
  currentItem: OrderControlledItem,
  nextItem: OrderControlledItem
) {
  return (
    currentItem.product_id === nextItem.product_id &&
    currentItem.product_name === nextItem.product_name &&
    currentItem.quantity === nextItem.quantity &&
    currentItem.mark === nextItem.mark &&
    currentItem.result === nextItem.result
  );
}

function areSameArrays<T>(
  currentItems: T[],
  nextItems: T[],
  isSameItem: (currentItem: T, nextItem: T) => boolean
) {
  return (
    currentItems.length === nextItems.length &&
    currentItems.every((currentItem, index) =>
      isSameItem(currentItem, nextItems[index])
    )
  );
}

function isSameOrder(currentOrder: Order, nextOrder: Order) {
  return (
    currentOrder.id === nextOrder.id &&
    currentOrder.number === nextOrder.number &&
    currentOrder.source === nextOrder.source &&
    currentOrder.status === nextOrder.status &&
    currentOrder.extended_status === nextOrder.extended_status &&
    currentOrder.order_created_at === nextOrder.order_created_at &&
    currentOrder.confirmation_date === nextOrder.confirmation_date &&
    currentOrder.delivery_date === nextOrder.delivery_date &&
    currentOrder.delivery_time === nextOrder.delivery_time &&
    currentOrder.order_sum === nextOrder.order_sum &&
    currentOrder.shipment_store_name === nextOrder.shipment_store_name &&
    areSameArrays(currentOrder.items, nextOrder.items, isSameOrderItem) &&
    areSameArrays(
      currentOrder.controlledItems,
      nextOrder.controlledItems,
      isSameControlledItem
    )
  );
}

function isSameOrdersResponse(
  currentData: OrdersResponse | null,
  nextData: OrdersResponse
) {
  return (
    currentData !== null &&
    currentData.page === nextData.page &&
    currentData.perPage === nextData.perPage &&
    currentData.totalPages === nextData.totalPages &&
    currentData.totalItems === nextData.totalItems &&
    areSameArrays(currentData.items, nextData.items, isSameOrder)
  );
}

function mergeOrderWithLocalControl(serverOrder: Order, localOrder: Order) {
  const localItemsByProductId = new Map(
    localOrder.items.map((item) => [item.product_id, item])
  );
  const serverProductIds = new Set(
    serverOrder.items.map((item) => item.product_id)
  );

  return {
    ...serverOrder,
    items: serverOrder.items.map((serverItem) => {
      const localItem = localItemsByProductId.get(serverItem.product_id);

      if (localItem === undefined) {
        return serverItem;
      }

      return {
        ...serverItem,
        product_name: localItem.product_name,
        marking_product: localItem.marking_product,
        quantity_fact: localItem.quantity_fact,
        is_weight: localItem.is_weight
      };
    }),
    controlledItems: localOrder.controlledItems.filter((item) =>
      serverProductIds.has(item.product_id)
    )
  };
}

export function OrdersList({
  layout = "grid",
  onOrdersCountChange
}: OrdersListProps = {}) {
  const [state, setState] = useState<OrdersState>(initialState);
  const [selectedStore, setSelectedStore] = useState<StoreSelectionSnapshot>(null);
  const [controlOrder, setControlOrder] = useState<Order | null>(null);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [controlProducts, setControlProducts] = useState<ProductsResponse>([]);
  const [controlLoadError, setControlLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PageNotification[]>([]);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [visibleOrdersLimit, setVisibleOrdersLimit] = useState(ORDERS_BATCH_SIZE);
  const isRequestInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const controlledOrdersRef = useRef(new Map<string, Order>());
  const productsCacheRef = useRef<ProductsCache | null>(null);
  const productsRequestInFlightRef = useRef<Promise<ProductsResponse> | null>(null);

  useEffect(() => {
    setHasAccessToken(getAccessTokenFromLocation() !== null);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setSelectedStore(getStoredStoreSelection());

    function handleStoreSelectionChange(event: Event) {
      setSelectedStore(
        event instanceof CustomEvent
          ? (event.detail as StoreSelectionSnapshot)
          : getStoredStoreSelection()
      );
    }

    window.addEventListener(
      STORE_SELECTION_CHANGE_EVENT,
      handleStoreSelectionChange
    );

    return () => {
      window.removeEventListener(
        STORE_SELECTION_CHANGE_EVENT,
        handleStoreSelectionChange
      );
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let activeController: AbortController | null = null;

    async function loadOrders() {
      if (isRequestInFlightRef.current) {
        return;
      }

      const controller = new AbortController();
      activeController = controller;
      isRequestInFlightRef.current = true;

      try {
        const data = await fetchOrders(controller.signal);

        if (!isMounted) {
          return;
        }

        const mergedControlledOrders = new Map<string, Order>();
        const dataWithLocalControl = {
          ...data,
          items: data.items.map((order) => {
            const localOrder = controlledOrdersRef.current.get(order.id);

            if (localOrder === undefined) {
              return order;
            }

            const mergedOrder = mergeOrderWithLocalControl(order, localOrder);
            mergedControlledOrders.set(order.id, mergedOrder);
            return mergedOrder;
          })
        };

        controlledOrdersRef.current = mergedControlledOrders;
        setControlOrder((currentOrder) =>
          currentOrder === null
            ? null
            : mergedControlledOrders.get(currentOrder.id) ?? currentOrder
        );

        setState((currentState) => ({
          data: isSameOrdersResponse(currentState.data, dataWithLocalControl)
            ? currentState.data
            : dataWithLocalControl,
          error: null,
          isLoading: false,
          lastUpdatedAt: new Date()
        }));
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          error:
            error instanceof Error ? error.message : "Не удалось загрузить заказы",
          isLoading: false
        }));
      } finally {
        if (activeController === controller) {
          activeController = null;
          isRequestInFlightRef.current = false;
        }
      }
    }

    loadOrders();

    const intervalId = window.setInterval(
      loadOrders,
      ORDERS_REFRESH_INTERVAL_SECONDS * 1000
    );

    return () => {
      isMounted = false;
      activeController?.abort();
      activeController = null;
      isRequestInFlightRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [ordersRefreshKey]);

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
      ? "-mx-1.5 grid gap-1.5"
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

  const getProductsForControl = useCallback(async () => {
    const cachedProducts = productsCacheRef.current;
    const currentTimestamp = Date.now();

    if (
      cachedProducts !== null &&
      currentTimestamp - cachedProducts.loadedAt < PRODUCTS_CACHE_TTL_MS
    ) {
      productsCacheRef.current = {
        ...cachedProducts,
        loadedAt: currentTimestamp
      };

      return cachedProducts.products;
    }

    if (productsRequestInFlightRef.current !== null) {
      return productsRequestInFlightRef.current;
    }

    const productsRequest = fetchProducts();
    productsRequestInFlightRef.current = productsRequest;

    try {
      const products = await productsRequest;
      productsCacheRef.current = {
        loadedAt: Date.now(),
        products
      };

      return products;
    } finally {
      if (productsRequestInFlightRef.current === productsRequest) {
        productsRequestInFlightRef.current = null;
      }
    }
  }, []);

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
  }, [getProductsForControl]);

  const showOrderNotification = useCallback(
    (title: string, body: string, tone: PageNotification["tone"]) => {
      const id = Date.now();
      setNotifications((current) => [...current, { id, title, body, tone }]);
      window.setTimeout(() => {
        setNotifications((current) => current.filter((item) => item.id !== id));
      }, 5000);
    },
    []
  );

  const handleConfirmOrder = useCallback(async (order: Order) => {
    const currentSeller = getStoredCurrentSeller();

    if (currentSeller === null) {
      showOrderNotification(
        "Не выбран продавец!",
        "Нажмите на кнопку выбора продавца и отсканируйте штрихкод на бедже.",
        "error"
      );
      return;
    }

    setConfirmingOrderId(order.id);

    try {
      const result = await confirmOrder({
        orderId: order.uid_1c,
        seller: currentSeller.userId
      });

      if (result.status === 200) {
        showOrderNotification(
          "Управление заказами",
          "Заказ успешно подтвержден",
          "success"
        );
      } else {
        showOrderNotification(
          "Управление заказами",
          `При подтверждении заказа произошла ошибка: ${result.data.mess}, статус заказа: ${result.data.data.status}`,
          "warning"
        );
      }

      if (result.status === 200 || result.status === 400) {
        setOrdersRefreshKey((current) => current + 1);
      }
    } catch {
      showOrderNotification(
        "Ошибка подтверждения",
        "При подтверждении заказа произошла ошибка: не удалось получить ответ сервера, статус заказа: неизвестен",
        "warning"
      );
    } finally {
      setConfirmingOrderId(null);
    }
  }, [showOrderNotification]);

  const handleCompleteOrder = useCallback(async (order: Order) => {
    if (order.items.every((item) => item.quantity_fact === 0)) {
      showOrderNotification(
        "Управление заказами",
        "Не отсканирован ни один товар!",
        "warning"
      );
      return;
    }

    const currentSeller = getStoredCurrentSeller();

    if (currentSeller === null) {
      showOrderNotification(
        "Не выбран продавец!",
        "Нажмите на кнопку выбора продавца и отсканируйте штрихкод на бедже.",
        "error"
      );
      return;
    }

    setCompletingOrderId(order.id);

    try {
      const result = await completeOrder({
        orderId: order.uid_1c,
        seller: currentSeller.userId,
        orderControlledItem: order.controlledItems.map(
          ({ product_id, product_name, quantity, mark }) => ({
            product_id,
            product_name,
            quantity,
            mark
          })
        )
      });

      if (result.status === 200) {
        showOrderNotification(
          "Управление заказами",
          "Заказ успешно собран",
          "success"
        );
        clearStoredOrderControl(order);
        setControlOrder(null);
      } else {
        showOrderNotification(
          "Управление заказами",
          `При сборке заказа произошла ошибка: ${result.data.mess}, статус заказа: ${result.data.data.status}`,
          "warning"
        );
      }

      if (result.status === 200 || result.status === 400) {
        controlledOrdersRef.current.delete(order.id);
        setOrdersRefreshKey((current) => current + 1);
      }
    } catch {
      showOrderNotification(
        "Ошибка завершения контроля",
        "При сборке заказа произошла ошибка: не удалось получить ответ сервера, статус заказа: неизвестен",
        "warning"
      );
    } finally {
      setCompletingOrderId(null);
    }
  }, [showOrderNotification]);

  return (
    <section className="-mt-2 space-y-3">
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
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Загружаем заказы...
        </div>
      ) : null}

      {!state.isLoading && filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm text-slate-600">
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
        onClose={(id) =>
          setNotifications((current) => current.filter((item) => item.id !== id))
        }
      />
    </section>
  );
}
