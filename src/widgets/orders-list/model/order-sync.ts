import type {
  Order,
  OrderControlledItem,
  OrderItem,
  OrdersResponse
} from "@/entities/order";

function isSameOrderItem(currentItem: OrderItem, nextItem: OrderItem) {
  return (
    currentItem.product_id === nextItem.product_id &&
    currentItem.product_name === nextItem.product_name &&
    currentItem.marking_product === nextItem.marking_product &&
    currentItem.quantity === nextItem.quantity &&
    currentItem.price === nextItem.price &&
    currentItem.amount === nextItem.amount &&
    currentItem.quantity_fact === nextItem.quantity_fact &&
    currentItem.is_weight === nextItem.is_weight
  );
}

function isSameControlledItem(
  currentItem: OrderControlledItem,
  nextItem: OrderControlledItem
) {
  return (
    currentItem.product_id === nextItem.product_id &&
    currentItem.product_name === nextItem.product_name &&
    currentItem.quantity === nextItem.quantity &&
    currentItem.mark === nextItem.mark &&
    currentItem.result === nextItem.result
  );
}

function areSameArrays<T>(
  currentItems: T[],
  nextItems: T[],
  isSameItem: (currentItem: T, nextItem: T) => boolean
) {
  return (
    currentItems.length === nextItems.length &&
    currentItems.every((item, index) => isSameItem(item, nextItems[index]))
  );
}

function isSameOrder(currentOrder: Order, nextOrder: Order) {
  return (
    currentOrder.id === nextOrder.id &&
    currentOrder.number === nextOrder.number &&
    currentOrder.source === nextOrder.source &&
    currentOrder.status === nextOrder.status &&
    currentOrder.extended_status === nextOrder.extended_status &&
    currentOrder.order_created_at === nextOrder.order_created_at &&
    currentOrder.confirmation_date === nextOrder.confirmation_date &&
    currentOrder.delivery_date === nextOrder.delivery_date &&
    currentOrder.delivery_time === nextOrder.delivery_time &&
    currentOrder.order_sum === nextOrder.order_sum &&
    currentOrder.shipment_store_name === nextOrder.shipment_store_name &&
    currentOrder.store_id === nextOrder.store_id &&
    areSameArrays(currentOrder.items, nextOrder.items, isSameOrderItem) &&
    areSameArrays(
      currentOrder.controlledItems,
      nextOrder.controlledItems,
      isSameControlledItem
    )
  );
}

export function isSameOrdersResponse(
  currentData: OrdersResponse | null,
  nextData: OrdersResponse
) {
  return (
    currentData !== null &&
    currentData.page === nextData.page &&
    currentData.perPage === nextData.perPage &&
    currentData.totalPages === nextData.totalPages &&
    currentData.totalItems === nextData.totalItems &&
    areSameArrays(currentData.items, nextData.items, isSameOrder)
  );
}

export function mergeOrderWithLocalControl(
  serverOrder: Order,
  localOrder: Order
) {
  const localItemsByProductId = new Map(
    localOrder.items.map((item) => [item.product_id, item])
  );
  const serverProductIds = new Set(
    serverOrder.items.map((item) => item.product_id)
  );

  return {
    ...serverOrder,
    items: serverOrder.items.map((serverItem) => {
      const localItem = localItemsByProductId.get(serverItem.product_id);
      return localItem === undefined
        ? serverItem
        : {
            ...serverItem,
            product_name: localItem.product_name,
            marking_product: localItem.marking_product,
            quantity_fact: localItem.quantity_fact,
            is_weight: localItem.is_weight
          };
    }),
    controlledItems: localOrder.controlledItems.filter((item) =>
      serverProductIds.has(item.product_id)
    )
  };
}
