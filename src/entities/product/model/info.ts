import { z } from "zod";
import { BarcodeInfoSchema } from "./schema";

// Photo metadata must not prevent the rest of the product card from loading.
const ProductImageSchema = z.unknown().transform((image): string | null => {
  if (typeof image === "string") return image;
  if (typeof image === "object" && image !== null && "url" in image && typeof image.url === "string") return image.url;
  return null;
});

const ProductReceiptSchema = z.object({
  type: z.string(),
  date: z.string(),
  number: z.string(),
  supplier: z.string(),
  store_id: z.string(),
  product_id: z.string(),
  quantity: z.number().optional()
});
const ProductReceiptsSchema = z.array(ProductReceiptSchema).nullish().transform((value) => value ?? []);

export function formatReceiptDate(value: string) {
  // Preserve the document's calendar date, independent of the browser timezone.
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "—";
}

export const ProductInfoSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  markingType: z.string(),
  isWeight: z.boolean(),
  isThermalMode: z.union([z.boolean(), z.enum(["True", "False"])]).transform((value) => value === true || value === "True"),
  barcodes: z.array(BarcodeInfoSchema),
  receipts: ProductReceiptsSchema,
  images: z.array(ProductImageSchema).nullish().transform((images) => images ?? []),
  price: z.number(),
  stock: z.number(),
  sold_yesterday_quantity: z.number().optional(),
  sold_week_quantity: z.number().optional(),
  receipts_yesterday_quantity: z.number().optional(),
  receipts_week_quantity: z.number().optional(),
  stock_days: z.number().optional(),
  price_eshop: z.number(),
  price_ozon: z.number(),
  price_yandex_eats: z.number(),
  promo_price_eshop: z.number(),
  promo_price_ozon: z.number(),
  promo_price_yandex_eats: z.number()
});
export const ProductInfoResponseSchema = z.object({
  resultCode: z.number(),
  messages: z.array(z.string()).default([]),
  receipts: ProductReceiptsSchema,
  data: z.array(ProductInfoSchema).nullish().transform((value) => value ?? [])
});
export type ProductInfo = z.infer<typeof ProductInfoSchema>;
