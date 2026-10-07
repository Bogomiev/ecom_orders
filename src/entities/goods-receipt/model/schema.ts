import { z } from "zod";

export const GoodsReceiptItemSchema = z.object({
  product_id: z.string(),
  quantity: z.number(),
  price: z.number(),
  amount: z.number()
});

export const GoodsReceiptSchema = z.object({
  type: z.enum(["RECEIPT", "TRANSFER", "ACCEPTANCE_ON_CONSIGNMENT"]),
  id: z.string(),
  number: z.string(),
  created_at: z.string(),
  sender: z.string(),
  shipment_store_name: z.string(),
  amount: z.number(),
  comment: z.string(),
  items: z.array(GoodsReceiptItemSchema)
});

export const GoodsReceiptsResponseSchema = z.object({
  page: z.number().int().min(1),
  perPage: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  items: z.array(GoodsReceiptSchema)
});

export const ConfirmInvoiceRequestSchema = z.object({
  invoiceId: z.string().trim().min(1),
  seller: z.string().trim().min(1)
});

export const InvoiceActionResponseSchema = z.object({
  code: z.number(),
  mess: z.string(),
  data: z.unknown().optional()
});

export type GoodsReceipt = z.infer<typeof GoodsReceiptSchema>;
export type GoodsReceiptsResponse = z.infer<typeof GoodsReceiptsResponseSchema>;
export type ConfirmInvoiceRequest = z.infer<typeof ConfirmInvoiceRequestSchema>;
