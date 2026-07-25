import type { z } from "zod";
import type {
  CompleteOrderRequestSchema,
  ConfirmOrderRequestSchema,
  OrderActionResponseSchema,
  OrderControlledItemSchema,
  OrderItemSchema,
  OrderSchema,
  OrdersResponseSchema
} from "./schema";

export type DateTime = string;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderControlledItem = z.infer<typeof OrderControlledItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type ConfirmOrderRequest = z.infer<typeof ConfirmOrderRequestSchema>;
export type CompleteOrderRequest = z.infer<typeof CompleteOrderRequestSchema>;
export type CompleteOrderControlledItem =
  CompleteOrderRequest["orderControlledItem"][number];
export type ConfirmOrderResponse = z.infer<typeof OrderActionResponseSchema>;
export type CompleteOrderResponse = z.infer<typeof OrderActionResponseSchema>;
export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;
