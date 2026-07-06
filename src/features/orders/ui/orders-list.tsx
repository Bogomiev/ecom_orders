"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Order, OrdersResponse } from "@/entities/order";
import type { ProductsResponse } from "@/entities/product";
import {
  getStoredStoreSelection,
  STORE_SELECTION_CHANGE_EVENT,
  type StoreSelectionSnapshot
} from "@/entities/store/model/store-selection";
import { OrdersPageHeader } from "@/widgets/orders-screen-header";
import {
  fetchProducts,
  fetchOrders,
  ORDERS_REFRESH_INTERVAL_SECONDS
} from "../api/orders";
import { OrderCard } from "./order-card";
import { OrderControl } from "./order-control";

type OrdersState = {
  data: OrdersResponse | null;
  error: string | null;
  isLoading: boolean;
  lastUpdatedAt: Date | null;
  products: ProductsResponse;
};

const initialState: OrdersState = {
  data: null,
  error: null,
  isLoading: true,
  lastUpdatedAt: null,
  products: []
};

function isSameOrdersResponse(
  currentData: OrdersResponse | null,
  nextData: OrdersResponse
) {
  return currentData !== null && JSON.stringify(currentData) === JSON.stringify(nextData);
}

export function OrdersList() {
  const [state, setState] = useState<OrdersState>(initialState);
  const [now, setNow] = useState(() => new Date());
  const [selectedStore, setSelectedStore] = useState<StoreSelectionSnapshot>(null);
  const [controlOrder, setControlOrder] = useState<Order | null>(null);
  const isRequestInFlightRef = useRef(false);
  const controlledOrdersRef = useRef(new Map<string, Order>());

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
        const [data, products] = await Promise.all([
          fetchOrders(controller.signal),
          fetchProducts(controller.signal)
        ]);

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
          lastUpdatedAt: new Date(),
          products
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
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

  return (
    <section className="space-y-3">
      <OrdersPageHeader currentTime={now} ordersCount={ordersCount} />

      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      ) : null}

      {state.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Загружаем заказы...
        </div>
      ) : null}

      {!state.isLoading && filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Заказов пока нет
        </div>
      ) : null}

      {filteredOrders.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              now={now}
              order={order}
              onOpen={setControlOrder}
            />
          ))}
        </div>
      ) : null}

      <OrderControl
        isOpen={controlOrder !== null}
        order={controlOrder}
        products={state.products}
        onOrderChange={updateControlledOrder}
        onClose={() => setControlOrder(null)}
      />
    </section>
  );
}
