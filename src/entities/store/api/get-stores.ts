import { StoresResponseSchema } from "@/entities/store";
import { fetchJson } from "@/shared/api/fetch-json";

export async function getStores(signal?: AbortSignal) {
  const { data } = await fetchJson(
    "/api/entities/stores",
    StoresResponseSchema,
    { cache: "no-store", signal }
  );
  return data;
}
