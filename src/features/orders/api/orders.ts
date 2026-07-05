import type { OrdersResponse } from "@/entities/order";
import type { Product, ProductsResponse } from "@/entities/product";

export const ORDERS_SERVICE_PATH = "/api/orders";
export const PRODUCTS_SERVICE_PATH = "/api/entities/product";
export const ORDERS_REFRESH_INTERVAL_SECONDS = 5;

type RawOrderItem = Omit<
  OrdersResponse["items"][number]["items"][number],
  "markingProduct" | "productName"
>;

type RawOrder = Omit<OrdersResponse["items"][number], "items"> & {
  items: RawOrderItem[];
};

type RawOrdersResponse = Omit<OrdersResponse, "items"> & {
  items: RawOrder[];
};

function enrichOrders(
  ordersResponse: RawOrdersResponse,
  products: ProductsResponse
): OrdersResponse {
  const productsById = new Map<string, Product>(
    products.map((product) => [product.uid, product])
  );

  return {
    ...ordersResponse,
    items: ordersResponse.items.map((order) => ({
      ...order,
      items: order.items.map((item) => {
        const product = productsById.get(item.productId);

        return {
          ...item,
          productName: product?.name ?? item.productId,
          markingProduct:
            product !== undefined &&
            product.markingType !== "БезОсобенностейУчета"
        };
      })
    }))
  };
}

export async function fetchOrders(signal?: AbortSignal): Promise<OrdersResponse> {
  const [ordersResponse, productsResponse] = await Promise.all([
    fetch(ORDERS_SERVICE_PATH, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal
    }),
    fetch(PRODUCTS_SERVICE_PATH, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal
    })
  ]);

  if (!ordersResponse.ok) {
    throw new Error(`Orders request failed with status ${ordersResponse.status}`);
  }

  if (!productsResponse.ok) {
    throw new Error(
      `Products request failed with status ${productsResponse.status}`
    );
  }

  const [orders, products] = await Promise.all([
    ordersResponse.json() as Promise<RawOrdersResponse>,
    productsResponse.json() as Promise<ProductsResponse>
  ]);

  return enrichOrders(orders, products);
}
