import type {
  CancelOrderRequest,
  CancelOrderResponse,
  CompleteOrderRequest,
  CompleteOrderResponse,
  ConfirmOrderRequest,
  ConfirmOrderResponse,
  OrdersResponse,
  GiveOrderToCourierRequest,
  GiveOrderToCourierResponse
} from "@/entities/order";
import {
  CancelOrderResponseSchema,
  OrderActionResponseSchema,
  OrdersResponseSchema,
  GiveOrderToCourierResponseSchema
} from "@/entities/order";
import type { ProductsResponse } from "@/entities/product";
import { ProductsResponseSchema } from "@/entities/product";
import { fetchJson } from "@/shared/api/fetch-json";

export const ORDERS_SERVICE_PATH = "/api/orders";
export const PRODUCTS_SERVICE_PATH = "/api/entities/product";
export const ORDERS_REFRESH_INTERVAL_SECONDS = 5;

export async function printOrder(orderId: string): Promise<string> {
  const response = await fetch(
    `${ORDERS_SERVICE_PATH}/print?${new URLSearchParams({ id: orderId })}`,
    {
      cache: "no-store",
      headers: { Accept: "text/plain" }
    }
  );
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Не удалось получить печатную форму. Статус: ${response.status}`);
  }

  return body.trim();
}

export type ConfirmOrderResult = {
  data: ConfirmOrderResponse;
  status: number;
};

export type CancelOrderResult = {
  data: CancelOrderResponse;
  status: number;
};

export type CompleteOrderResult = {
  data: CompleteOrderResponse;
  status: number;
};

export type GiveOrderToCourierResult = {
  data: GiveOrderToCourierResponse;
  status: number;
};

export async function fetchOrders(
  storeId?: string,
  signal?: AbortSignal,
  historyDays?: number
): Promise<OrdersResponse> {
  const searchParams = new URLSearchParams();
  if (storeId) searchParams.set("store", storeId);
  if (historyDays !== undefined) searchParams.set("historyDays", String(historyDays));
  const query = searchParams.toString();
  const path = query ? `${ORDERS_SERVICE_PATH}?${query}` : ORDERS_SERVICE_PATH;
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

export async function giveOrderToCourier(
  body: GiveOrderToCourierRequest
): Promise<GiveOrderToCourierResult> {
  const response = await fetchJson(
    `${ORDERS_SERVICE_PATH}/give-to-courier`,
    GiveOrderToCourierResponseSchema,
    {
      acceptErrorResponse: true,
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  return {
    data: response.data,
    status: response.status
  };
}

export async function cancelOrder(
  body: CancelOrderRequest
): Promise<CancelOrderResult> {
  const response = await fetchJson(
    `${ORDERS_SERVICE_PATH}/cancel`,
    CancelOrderResponseSchema,
    {
      acceptErrorResponse: true,
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

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
