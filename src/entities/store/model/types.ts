import type { z } from "zod";
import type { StoreSchema, StoresResponseSchema } from "./schema";

export type Store = z.infer<typeof StoreSchema>;
export type StoresResponse = z.infer<typeof StoresResponseSchema>;
