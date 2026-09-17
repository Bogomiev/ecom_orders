import { StoresResponseSchema } from "@/entities/store";
import { fetchJson } from "@/shared/api/fetch-json";

export async function getStores(signal?: AbortSignal, userToken?: string) {
  const { data } = await fetchJson(
    "/api/entities/stores",
    StoresResponseSchema,
    { cache: "no-store", signal, headers: userToken ? { "X-User-Token": userToken } : undefined }
  );
  return data;
}
