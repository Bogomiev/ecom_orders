import type {
  CompleteOrderRequest,
  CompleteOrderResponse,
  ConfirmOrderRequest,
  ConfirmOrderResponse,
  OrdersResponse
} from "@/entities/order";
import type { Product, ProductsResponse } from "@/entities/product";

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
  const ordersResponse = await fetch(ORDERS_SERVICE_PATH, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal
  });

  if (!ordersResponse.ok) {
    throw new Error(`Orders request failed with status ${ordersResponse.status}`);
  }

  return ordersResponse.json() as Promise<OrdersResponse>;
}

export async function confirmOrder(
  body: ConfirmOrderRequest
): Promise<ConfirmOrderResult> {
  const response = await fetch(`${ORDERS_SERVICE_PATH}/confirm`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return {
    data: (await response.json()) as ConfirmOrderResponse,
    status: response.status
  };
}

export async function completeOrder(
  body: CompleteOrderRequest
): Promise<CompleteOrderResult> {
  const response = await fetch(`${ORDERS_SERVICE_PATH}/complete`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return {
    data: (await response.json()) as CompleteOrderResponse,
    status: response.status
  };
}

export async function fetchProducts(
  signal?: AbortSignal
): Promise<ProductsResponse> {
  const response = await fetch(PRODUCTS_SERVICE_PATH, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`Products request failed with status ${response.status}`);
  }

  return response.json() as Promise<ProductsResponse>;
}
