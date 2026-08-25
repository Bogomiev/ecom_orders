import type { Order, OrderControlledItem } from "./types";

const ORDER_CONTROL_STORAGE_KEY_PREFIX = "ecom-orders-control:";
const QUANTITY_BAGS_STORAGE_KEY_SUFFIX = "quantity-bags";

type StoredOrderControlItem = {
  controlledItems: OrderControlledItem[];
  quantityFact: number;
};

function getStorageKey(orderId: string, productId: string) {
  return `${ORDER_CONTROL_STORAGE_KEY_PREFIX}${orderId}:${productId}`;
}

function getQuantityBagsStorageKey(orderId: string) {
  return `${ORDER_CONTROL_STORAGE_KEY_PREFIX}${orderId}:${QUANTITY_BAGS_STORAGE_KEY_SUFFIX}`;
}

function readStoredQuantityBags(orderId: string) {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(
    getQuantityBagsStorageKey(orderId)
  );
  if (rawValue === null) return null;

  const value = Number(rawValue);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function isControlledItem(value: unknown): value is OrderControlledItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "product_id" in value &&
    "product_name" in value &&
    "quantity" in value &&
    "mark" in value &&
    "result" in value &&
    typeof value.product_id === "string" &&
    typeof value.product_name === "string" &&
    typeof value.quantity === "number" &&
    typeof value.mark === "string" &&
    typeof value.result === "boolean"
  );
}

function readStoredItem(
  orderId: string,
  productId: string
): StoredOrderControlItem | null {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(
    getStorageKey(orderId, productId)
  );

  if (rawValue === null) return null;

  try {
    const value = JSON.parse(rawValue) as Partial<StoredOrderControlItem>;

    if (
      typeof value.quantityFact !== "number" ||
      !Number.isFinite(value.quantityFact) ||
      value.quantityFact < 0 ||
      !Array.isArray(value.controlledItems) ||
      !value.controlledItems.every(isControlledItem)
    ) {
      return null;
    }

    return {
      controlledItems: value.controlledItems.filter(
        (item) => item.product_id === productId
      ),
      quantityFact: value.quantityFact
    };
  } catch {
    return null;
  }
}

export function saveOrderControl(order: Order) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getQuantityBagsStorageKey(order.uid_1c),
    String(order.quantityBags)
  );

  order.items.forEach((item) => {
    if (item.quantity_fact <= 0) {
      window.localStorage.removeItem(
        getStorageKey(order.uid_1c, item.product_id)
      );
      return;
    }

    const value: StoredOrderControlItem = {
      controlledItems: order.controlledItems.filter(
        (controlledItem) => controlledItem.product_id === item.product_id
      ),
      quantityFact: item.quantity_fact
    };

    window.localStorage.setItem(
      getStorageKey(order.uid_1c, item.product_id),
      JSON.stringify(value)
    );
  });
}

export function restoreOrderControl(order: Order): Order {
  if (typeof window === "undefined") return order;

  const storedItems = new Map(
    order.items.flatMap((item) => {
      const storedItem = readStoredItem(order.uid_1c, item.product_id);
      return storedItem === null ? [] : [[item.product_id, storedItem] as const];
    })
  );
  const storedQuantityBags = readStoredQuantityBags(order.uid_1c);

  if (storedItems.size === 0 && storedQuantityBags === null) return order;

  const restoredProductIds = new Set(storedItems.keys());

  return {
    ...order,
    quantityBags: storedQuantityBags ?? order.quantityBags,
    items: order.items.map((item) => {
      const storedItem = storedItems.get(item.product_id);
      return storedItem === undefined
        ? item
        : { ...item, quantity_fact: storedItem.quantityFact };
    }),
    controlledItems: [
      ...order.controlledItems.filter(
        (item) => !restoredProductIds.has(item.product_id)
      ),
      ...Array.from(storedItems.values()).flatMap(
        (item) => item.controlledItems
      )
    ]
  };
}

export function clearStoredOrderControl(order: Order) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(getQuantityBagsStorageKey(order.uid_1c));

  order.items.forEach((item) => {
    window.localStorage.removeItem(
      getStorageKey(order.uid_1c, item.product_id)
    );
  });
}
