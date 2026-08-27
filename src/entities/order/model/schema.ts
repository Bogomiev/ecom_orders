import { z } from "zod";

export const OrderControlledItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
  mark: z.string(),
  result: z.boolean()
});

export const OrderItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  marking_product: z.boolean(),
  quantity: z.number(),
  price: z.number(),
  amount: z.number(),
  canceled: z.boolean(),
  quantity_fact: z.number(),
  is_weight: z.boolean()
});

export const OrderSchema = z.object({
  id: z.string(),
  uid_1c: z.string(),
  number: z.string(),
  external_id: z.string().nullish(),
  source: z.string(),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  status: z.string(),
  extended_status: z.string(),
  order_created_at: z.string(),
  confirmation_date: z.string(),
  delivery_date: z.string(),
  delivery_time: z.string(),
  delivery_time_by: z.string(),
  address: z.string(),
  order_sum: z.number(),
  comment: z.string(),
  shipment_store_name: z.string(),
  store_id: z.string(),
  quantityBags: z.number().int().min(0).max(9),
  items: z.array(OrderItemSchema),
  controlledItems: z.array(OrderControlledItemSchema)
});

export const OrdersResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  items: z.array(OrderSchema)
});

export enum ConfirmOrderItemAction {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED"
}

export const ConfirmOrderItemSchema = z.object({
  product_id: z.string().min(1),
  action: z.enum(ConfirmOrderItemAction)
});

export const ConfirmOrderRequestSchema = z.object({
  orderId: z.string().min(1),
  seller: z.string().min(1),
  items: z.array(ConfirmOrderItemSchema)
});

export const GiveOrderToCourierRequestSchema = z.object({
  orderId: z.string().min(1),
  seller: z.string().min(1)
});

export const CancelOrderRequestSchema = z.object({
  orderId: z.string().min(1),
  seller: z.string().min(1)
});

export const CompleteOrderRequestSchema = ConfirmOrderRequestSchema.omit({ items: true }).extend({
  quantityBags: z.number().int().min(1).max(9),
  orderControlledItem: z.array(
    OrderControlledItemSchema.omit({ result: true })
  )
});

const orderActionResponseShape = {
  code: z.number(),
  mess: z.string(),
  data: z.object({
    order: z.string(),
    status: z.string(),
    seller: z.string()
  })
};

export const OrderActionResponseSchema = z.object(orderActionResponseShape);
export const CancelOrderResponseSchema = z.object(orderActionResponseShape);
export const GiveOrderToCourierResponseSchema = z.object(orderActionResponseShape);
