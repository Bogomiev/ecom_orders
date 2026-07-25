import { z } from "zod";

export const StoreSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  uid_1c: z.string(),
  address: z.string(),
  pin: z.string()
});

export const StoresResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  items: z.array(StoreSchema)
});
