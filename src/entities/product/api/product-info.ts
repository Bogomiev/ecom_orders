import { fetchJson } from "@/shared/api/fetch-json";
import type { Product } from "../model/types";
import { ProductInfoResponseSchema } from "../model/info";

export async function fetchProductInfo(storeId: string, value: string, products: Pick<Product, "uid">[], scanned = false, signal?: AbortSignal) {
  const product = products.find((item) => item.uid.toLowerCase() === value.toLowerCase());
  if (scanned && !product) return [];
  const fields = scanned ? ["product_id"] as const : product ? ["product_id", "code", "name"] as const : ["code", "name"] as const;
  for (const field of fields) {
    const query = new URLSearchParams({ store_id: storeId, [field]: field === "product_id" ? product!.uid : value });
    const { data: response } = await fetchJson(`/api/entities/product/info?${query}`, ProductInfoResponseSchema, { cache: "no-store", signal });
    if (response.resultCode !== 0) throw new Error(response.messages.join("; ") || "Не удалось получить информацию о товаре");
    if (response.data.length > 0) return response.data.map((item) => ({
      ...item,
      receipts: (item.receipts?.length ? item.receipts : response.receipts ?? [])
        .filter((receipt) => receipt.product_id.toLowerCase() === item.id.toLowerCase() && receipt.store_id.toLowerCase() === storeId.toLowerCase())
    }));
  }
  return [];
}
