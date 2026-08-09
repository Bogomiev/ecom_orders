"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction
} from "react";
import type { Order, OrdersResponse } from "@/entities/order";
import { fetchOrders, ORDERS_REFRESH_INTERVAL_SECONDS } from "../api/orders";
import {
  isSameOrdersResponse,
  mergeOrderWithLocalControl
} from "./order-sync";

export type OrdersState = {
  data: OrdersResponse | null;
  error: string | null;
  isLoading: boolean;
  lastUpdatedAt: Date | null;
};

const initialState: OrdersState = {
  data: null,
  error: null,
  isLoading: true,
  lastUpdatedAt: null
};

type UseOrdersOptions = {
  controlledOrdersRef: RefObject<Map<string, Order>>;
  onRefreshResult?: (refreshKey: number, succeeded: boolean) => void;
  refreshKey: number;
  setControlOrder: Dispatch<SetStateAction<Order | null>>;
  storeId?: string;
  historyDays?: number;
};

export function useOrders({
  controlledOrdersRef,
  onRefreshResult,
  refreshKey,
  setControlOrder,
  storeId,
  historyDays
}: UseOrdersOptions) {
  const [state, setState] = useState<OrdersState>(initialState);
  const isRequestInFlightRef = useRef(false);

  useEffect(() => {
    if (!storeId) {
      setState((current) => ({
        ...current,
        data: null,
        error: null,
        isLoading: false
      }));
      return;
    }

    let isMounted = true;
    let activeController: AbortController | null = null;

    async function loadOrders() {
      if (isRequestInFlightRef.current) return;
      const controller = new AbortController();
      activeController = controller;
      isRequestInFlightRef.current = true;

      try {
        const data = await fetchOrders(storeId, controller.signal, historyDays);
        if (!isMounted) return;

        const mergedControlledOrders = new Map<string, Order>();
        const dataWithLocalControl = {
          ...data,
          items: data.items.map((order) => {
            const localOrder = controlledOrdersRef.current.get(order.id);
            if (localOrder === undefined) return order;
            const mergedOrder = mergeOrderWithLocalControl(order, localOrder);
            mergedControlledOrders.set(order.id, mergedOrder);
            return mergedOrder;
          })
        };

        controlledOrdersRef.current = mergedControlledOrders;
        setControlOrder((current) =>
          current === null
            ? null
            : mergedControlledOrders.get(current.id) ?? current
        );
        setState((current) => ({
          data: isSameOrdersResponse(current.data, dataWithLocalControl)
            ? current.data
            : dataWithLocalControl,
          error: null,
          isLoading: false,
          lastUpdatedAt: new Date()
        }));
        onRefreshResult?.(refreshKey, true);
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error
            ? error.message
            : "Не удалось загрузить заказы",
          isLoading: false
        }));
        onRefreshResult?.(refreshKey, false);
      } finally {
        if (activeController === controller) {
          activeController = null;
          isRequestInFlightRef.current = false;
        }
      }
    }

    void loadOrders();
    const interval = window.setInterval(
      loadOrders,
      ORDERS_REFRESH_INTERVAL_SECONDS * 1000
    );

    return () => {
      isMounted = false;
      activeController?.abort();
      isRequestInFlightRef.current = false;
      window.clearInterval(interval);
    };
  }, [controlledOrdersRef, historyDays, onRefreshResult, refreshKey, setControlOrder, storeId]);

  return { setState, state };
}
