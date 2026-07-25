import { z } from "zod";

export const BarcodeInfoSchema = z.object({
  barcode: z.string(),
  unit: z.string(),
  ratio: z.number(),
  isBase: z.boolean()
});

export const ProductSchema = z.object({
  uid: z.string(),
  code: z.string(),
  name: z.string(),
  markingType: z.string(),
  isWeight: z.boolean(),
  barcodes: z.array(BarcodeInfoSchema)
});

export const ProductsResponseSchema = z.array(ProductSchema);
