import type {
  CompleteOrderRequest,
  CompleteOrderResponse,
  ConfirmOrderRequest,
  ConfirmOrderResponse,
  OrdersResponse
} from "@/entities/order";
import {
  OrderActionResponseSchema,
  OrdersResponseSchema
} from "@/entities/order";
import type { ProductsResponse } from "@/entities/product";
import { ProductsResponseSchema } from "@/entities/product";
import { fetchJson } from "@/shared/api/fetch-json";

export const ORDERS_SERVICE_PATH = "/api/orders";
export const PRODUCTS_SERVICE_PATH = "/api/entities/product";
export const ORDERS_REFRESH_INTERVAL_SECONDS = 5;

export type ConfirmOrderResult = {
  data: ConfirmOrderResponse;
  status: number;
};

export type CompleteOrderResult = {
  data: CompleteOrderResponse;
  status: number;
};

export async function fetchOrders(
  storeId?: string,
  signal?: AbortSignal
): Promise<OrdersResponse> {
  const path = storeId
    ? `${ORDERS_SERVICE_PATH}?${new URLSearchParams({ store: storeId })}`
    : ORDERS_SERVICE_PATH;
  const { data } = await fetchJson(path, OrdersResponseSchema, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal
  });

  return data;
}

export async function confirmOrder(
  body: ConfirmOrderRequest
): Promise<ConfirmOrderResult> {
  const response = await fetchJson(`${ORDERS_SERVICE_PATH}/confirm`, OrderActionResponseSchema, {
    acceptErrorResponse: true,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return {
    data: response.data,
    status: response.status
  };
}

export async function completeOrder(
  body: CompleteOrderRequest
): Promise<CompleteOrderResult> {
  const response = await fetchJson(`${ORDERS_SERVICE_PATH}/complete`, OrderActionResponseSchema, {
    acceptErrorResponse: true,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return {
    data: response.data,
    status: response.status
  };
}

export async function fetchProducts(
  signal?: AbortSignal,
  refresh = false
): Promise<ProductsResponse> {
  const path = refresh
    ? `${PRODUCTS_SERVICE_PATH}?refresh=1`
    : PRODUCTS_SERVICE_PATH;
  const { data } = await fetchJson(path, ProductsResponseSchema, {
    cache: refresh ? "no-store" : "default",
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal
  });

  return data;
}
