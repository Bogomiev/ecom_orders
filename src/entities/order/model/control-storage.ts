import type { Order, OrderControlledItem } from "./types";

const ORDER_CONTROL_STORAGE_KEY_PREFIX = "ecom-orders-control:";
const QUANTITY_BAGS_STORAGE_KEY_SUFFIX = "quantity-bags";
const QUANTITY_THERMAL_BAGS_S_STORAGE_KEY_SUFFIX = "quantity-thermal-bags-s";
const QUANTITY_THERMAL_BAGS_M_STORAGE_KEY_SUFFIX = "quantity-thermal-bags-m";

type StoredOrderControlItem = {
  controlledItems: OrderControlledItem[];
  quantityFact: number;
};

function getStorageKey(orderId: string, productId: string) {
  return `${ORDER_CONTROL_STORAGE_KEY_PREFIX}${orderId}:${productId}`;
}

function getQuantityStorageKey(orderId: string, suffix: string) {
  return `${ORDER_CONTROL_STORAGE_KEY_PREFIX}${orderId}:${suffix}`;
}

function readStoredQuantity(orderId: string, suffix: string) {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(
    getQuantityStorageKey(orderId, suffix)
  );
  if (rawValue === null) return null;

  const value = Number(rawValue);
  return Number.isInteger(value) && value >= 0 && value <= 9 ? value : null;
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
    getQuantityStorageKey(order.uid_1c, QUANTITY_BAGS_STORAGE_KEY_SUFFIX),
    String(order.quantityBags)
  );
  window.localStorage.setItem(
    getQuantityStorageKey(order.uid_1c, QUANTITY_THERMAL_BAGS_S_STORAGE_KEY_SUFFIX),
    String(order.quantityThermalBagsS)
  );
  window.localStorage.setItem(
    getQuantityStorageKey(order.uid_1c, QUANTITY_THERMAL_BAGS_M_STORAGE_KEY_SUFFIX),
    String(order.quantityThermalBagsM)
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
  const storedQuantityBags = readStoredQuantity(order.uid_1c, QUANTITY_BAGS_STORAGE_KEY_SUFFIX);
  const storedQuantityThermalBagsS = readStoredQuantity(order.uid_1c, QUANTITY_THERMAL_BAGS_S_STORAGE_KEY_SUFFIX);
  const storedQuantityThermalBagsM = readStoredQuantity(order.uid_1c, QUANTITY_THERMAL_BAGS_M_STORAGE_KEY_SUFFIX);

  if (storedItems.size === 0 && storedQuantityBags === null && storedQuantityThermalBagsS === null && storedQuantityThermalBagsM === null) return order;

  const restoredProductIds = new Set(storedItems.keys());

  return {
    ...order,
    quantityBags: storedQuantityBags ?? order.quantityBags,
    quantityThermalBagsS: storedQuantityThermalBagsS ?? order.quantityThermalBagsS,
    quantityThermalBagsM: storedQuantityThermalBagsM ?? order.quantityThermalBagsM,
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

  window.localStorage.removeItem(getQuantityStorageKey(order.uid_1c, QUANTITY_BAGS_STORAGE_KEY_SUFFIX));
  window.localStorage.removeItem(getQuantityStorageKey(order.uid_1c, QUANTITY_THERMAL_BAGS_S_STORAGE_KEY_SUFFIX));
  window.localStorage.removeItem(getQuantityStorageKey(order.uid_1c, QUANTITY_THERMAL_BAGS_M_STORAGE_KEY_SUFFIX));

  order.items.forEach((item) => {
    window.localStorage.removeItem(
      getStorageKey(order.uid_1c, item.product_id)
    );
  });
}
