import { rmsRequest } from "@/entities/task/api";
import type { PriceTagProductState } from "./model";

// The price tag of a product in a store, and putting the product into the standing «Печать ценников» task
// of the store (RMS creates the task when the store has none open).
export function loadPriceTagProduct(storeID: string, productID: string) {
 return rmsRequest<PriceTagProductState>(`tasks/price_tags/product?${new URLSearchParams({ store_id: storeID, product_id: productID })}`);
}
export function addPriceTagProduct(storeID: string, productID: string) {
 return rmsRequest<PriceTagProductState>("tasks/price_tags/product", "POST", { store_id: storeID, product_id: productID });
}
