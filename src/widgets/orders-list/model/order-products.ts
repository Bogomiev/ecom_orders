import type { Order } from "@/entities/order";
import type { Product, ProductsResponse } from "@/entities/product";

export function getMissingOrderProductIds(
  order: Order,
  products: ProductsResponse
) {
  const productIds = new Set(products.map((product) => product.uid));
  return order.items
    .map((item) => item.product_id)
    .filter((productId) => !productIds.has(productId));
}

export function enrichOrder(
  order: Order,
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
