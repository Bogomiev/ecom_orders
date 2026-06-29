import type { OrdersResponse } from "@/entities/order";

export const ORDERS_SERVICE_PATH = "/api/orders";
export const ORDERS_REFRESH_INTERVAL_SECONDS = 5;

export async function fetchOrders(signal?: AbortSignal): Promise<OrdersResponse> {
  const response = await fetch(ORDERS_SERVICE_PATH, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`Orders request failed with status ${response.status}`);
  }

  return response.json();
}
