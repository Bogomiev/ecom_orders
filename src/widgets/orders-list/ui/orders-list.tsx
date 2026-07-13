"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Order, OrderControlledItem, OrderItem, OrdersResponse } from "@/entities/order";
import type { ProductsResponse } from "@/entities/product";
import {
  getStoredStoreSelection,
  getAccessTokenFromLocation,
  STORE_SELECTION_CHANGE_EVENT,
  type StoreSelectionSnapshot
} from "@/entities/store";
import {
  enrichOrder,
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
    currentOrder.external_id === nextOrder.external_id &&
    currentOrder.number === nextOrder.number &&
    currentOrder.source === nextOrder.source &&
    currentOrder.customer === nextOrder.customer &&
    currentOrder.status === nextOrder.status &&
    currentOrder.extended_status === nextOrder.extended_status &&
    currentOrder.external_status === nextOrder.external_status &&
    currentOrder.order_method === nextOrder.order_method &&
    currentOrder.payment_status === nextOrder.payment_status &&
    currentOrder.delivery_code === nextOrder.delivery_code &&
    currentOrder.order_created_at === nextOrder.order_created_at &&
    currentOrder.confirmation_date === nextOrder.confirmation_date &&
    currentOrder.delivery_date === nextOrder.delivery_date &&
    currentOrder.delivery_time === nextOrder.delivery_time &&
    currentOrder.order_sum === nextOrder.order_sum &&
    currentOrder.total_discount === nextOrder.total_discount &&
    currentOrder.delivery_cost === nextOrder.delivery_cost &&
    currentOrder.currency === nextOrder.currency &&
    currentOrder.is_paid === nextOrder.is_paid &&
    currentOrder.created === nextOrder.created &&
    currentOrder.updated === nextOrder.updated &&
    currentOrder.shipment_store_ref === nextOrder.shipment_store_ref &&
    currentOrder.shipment_store_name === nextOrder.shipment_store_name &&
    currentOrder.shipment_store_phone === nextOrder.shipment_store_phone &&
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

        const dataWithLocalControl = {
          ...data,
          items: data.items.map(
            (order) => controlledOrdersRef.current.get(order.id) ?? order
          )
        };

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
        }

        isRequestInFlightRef.current = false;
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
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const orders = state.data?.items ?? [];

    if (selectedStore === null) {
      return orders;
    }

    return orders.filter(
      (order) => order.shipment_store_name === selectedStore.name
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

      const enrichedOrder = enrichOrder(order, products);
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
                  isOpening={openingOrderId === order.id}
                  order={order}
                  onCollapse={() => setExpandedOrderId(null)}
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
        order={controlOrder}
        products={controlProducts}
        onOrderChange={updateControlledOrder}
        onClose={() => setControlOrder(null)}
      />
    </section>
  );
}
