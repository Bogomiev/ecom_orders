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
import type { Product, ProductsResponse } from "@/entities/product";
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

export function enrichOrder(
  order: OrdersResponse["items"][number],
  products: ProductsResponse
) {
  const productsById = new Map<string, Product>(
    products.map((product) => [product.uid, product])
  );

  return {
    ...order,
    items: order.items.map((item) => {
      const product = productsById.get(item.product_id);

      return {
        ...item,
        product_name: product?.name ?? item.product_id,
        marking_product:
          product !== undefined &&
          product.markingType !== "БезОсобенностейУчета",
        is_weight: product?.isWeight ?? false
      };
    })
  };
}

export async function fetchOrders(signal?: AbortSignal): Promise<OrdersResponse> {
  const { data } = await fetchJson(ORDERS_SERVICE_PATH, OrdersResponseSchema, {
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
  signal?: AbortSignal
): Promise<ProductsResponse> {
  const { data } = await fetchJson(PRODUCTS_SERVICE_PATH, ProductsResponseSchema, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal
  });

  return data;
}
