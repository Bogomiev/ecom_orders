import { z } from "zod";

export const SellerSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string()
});

export const SellersResponseSchema = z.object({
  code: z.number(),
  mess: z.string(),
  data: z.array(SellerSchema)
});
