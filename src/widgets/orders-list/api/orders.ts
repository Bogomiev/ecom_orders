import type { OrdersResponse } from "@/entities/order";
import type { Product, ProductsResponse } from "@/entities/product";

export const ORDERS_SERVICE_PATH = "/api/orders";
export const PRODUCTS_SERVICE_PATH = "/api/entities/product";
export const ORDERS_REFRESH_INTERVAL_SECONDS = 5;

type RawOrderItem = Omit<
  OrdersResponse["items"][number]["items"][number],
  "is_weight" | "marking_product" | "product_name"
>;

type RawOrder = Omit<OrdersResponse["items"][number], "items"> & {
  items: RawOrderItem[];
};

type RawOrdersResponse = Omit<OrdersResponse, "items"> & {
  items: RawOrder[];
};

function normalizeOrders(ordersResponse: RawOrdersResponse): OrdersResponse {
  return {
    ...ordersResponse,
    items: ordersResponse.items.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product_name: item.product_id,
        marking_product: false,
        is_weight: false
      }))
    }))
  };
}

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

  const orders = (await ordersResponse.json()) as RawOrdersResponse;

  return normalizeOrders(orders);
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
