import { SellersResponseSchema, type Seller } from "@/entities/seller";
import { fetchJson } from "@/shared/api/fetch-json";

export async function findSellerByBarcode(barcode: string): Promise<Seller | null> {
  const searchParams = new URLSearchParams({ sellerBarcode: barcode.trim() });
  const { data } = await fetchJson(
    `/api/entities/sellers?${searchParams}`,
    SellersResponseSchema,
    { cache: "no-store" }
  );
  return data.data[0] ?? null;
}
