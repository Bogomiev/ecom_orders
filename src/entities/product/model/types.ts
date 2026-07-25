import type { z } from "zod";
import type {
  BarcodeInfoSchema,
  ProductSchema,
  ProductsResponseSchema
} from "./schema";

export type BarcodeInfo = z.infer<typeof BarcodeInfoSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
