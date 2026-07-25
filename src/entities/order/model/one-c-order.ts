import { z } from "zod";
import type { OrdersResponse } from "./types";

const OneCOrderItemSchema = z.object({
  product_id: z.string(),
  quantity: z.number(),
  price: z.number(),
  amount: z.number(),
  quantity_fact: z.number().nullable().optional()
});

const OneCControlledItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
  mark: z.string(),
  result: z.boolean()
});

const OneCOrderSchema = z.object({
  id: z.string(),
  uid_1c: z.string(),
  number: z.string(),
  source: z.string(),
  status: z.string(),
  extended_status: z.string(),
  order_created_at: z.string(),
  confirmation_date: z.string(),
  delivery_date: z.string(),
  delivery_time: z.string(),
  order_sum: z.number(),
  shipment_store_name: z.string(),
  store_id: z.string(),
  items: z.array(OneCOrderItemSchema),
  controlledItems: z.array(OneCControlledItemSchema).nullable().optional()
});

export const OneCOrdersResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  items: z.array(OneCOrderSchema)
});

export type OneCOrdersResponse = z.infer<typeof OneCOrdersResponseSchema>;

export function normalizeOneCOrders(data: OneCOrdersResponse): OrdersResponse {
  return {
    ...data,
    items: data.items.map(({ controlledItems, items, ...order }) => ({
      ...order,
      controlledItems: controlledItems ?? [],
      items: items.map(({ quantity_fact, ...item }) => ({
        ...item,
        product_name: item.product_id,
        marking_product: false,
        quantity_fact: quantity_fact ?? 0,
        is_weight: false
      }))
    }))
  };
}
