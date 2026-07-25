import type { z } from "zod";
import type { SellerSchema, SellersResponseSchema } from "./schema";

export type Seller = z.infer<typeof SellerSchema>;
export type SellersResponse = z.infer<typeof SellersResponseSchema>;
