import type {
  CompleteOrderControlledItem,
  Order
} from "@/entities/order";

export function getCompleteOrderItems(
  order: Order
): CompleteOrderControlledItem[] {
  return order.items.flatMap((item) => {
    if (item.canceled || item.quantity_fact <= 0) return [];

    const controlledItems = order.controlledItems.filter(
      (controlledItem) => controlledItem.product_id === item.product_id
    );

    if (controlledItems.length > 0) {
      return controlledItems.map(
        ({ product_id, product_name, quantity, mark }) => ({
          product_id,
          product_name,
          quantity,
          mark
        })
      );
    }

    return [{
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity_fact,
      mark: ""
    }];
  });
}
