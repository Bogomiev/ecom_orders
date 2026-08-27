import type { z } from "zod";
import type {
  CancelOrderRequestSchema,
  CancelOrderResponseSchema,
  CompleteOrderRequestSchema,
  ConfirmOrderItemSchema,
  ConfirmOrderRequestSchema,
  OrderActionResponseSchema,
  OrderControlledItemSchema,
  OrderItemSchema,
  OrderSchema,
  OrdersResponseSchema,
  GiveOrderToCourierRequestSchema,
  GiveOrderToCourierResponseSchema
} from "./schema";

export type DateTime = string;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderControlledItem = z.infer<typeof OrderControlledItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type ConfirmOrderRequest = z.infer<typeof ConfirmOrderRequestSchema>;
export type ConfirmOrderItem = z.infer<typeof ConfirmOrderItemSchema>;
export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema>;
export type CompleteOrderRequest = z.infer<typeof CompleteOrderRequestSchema>;
export type CompleteOrderControlledItem =
  CompleteOrderRequest["orderControlledItem"][number];
export type ConfirmOrderResponse = z.infer<typeof OrderActionResponseSchema>;
export type GiveOrderToCourierRequest = z.infer<typeof GiveOrderToCourierRequestSchema>;
export type GiveOrderToCourierResponse = z.infer<typeof GiveOrderToCourierResponseSchema>;
export type CancelOrderResponse = z.infer<typeof CancelOrderResponseSchema>;
export type CompleteOrderResponse = z.infer<typeof OrderActionResponseSchema>;
export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;
