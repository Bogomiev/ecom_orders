import { rmsRequest } from "@/entities/task/api";
import type { PriceTagItem, PriceTagProduct, PriceTagTask } from "./model/price-tag-task";

const base = (taskID: number) => `tasks/${taskID}/price_tags`;
export function loadPriceTagTask(taskID: number) { return rmsRequest<PriceTagTask>(base(taskID)); }
export function addPriceTag(taskID: number, productID: string) { return rmsRequest<unknown>(base(taskID), "POST", { product_id: productID }); }
export function savePriceTag(taskID: number, item: Pick<PriceTagItem, "id" | "tag_type" | "quantity" | "unit">) {
 return rmsRequest<unknown>(`${base(taskID)}/${item.id}`, "PUT", { tag_type: item.tag_type, quantity: item.quantity, unit: item.unit });
}
export function deletePriceTag(taskID: number, itemID: number) { return rmsRequest<unknown>(`${base(taskID)}/${itemID}`, "DELETE"); }
export function markPriceTagsPrinted(taskID: number, ids: number[]) { return rmsRequest<{ status: PriceTagTask["status"] }>(`${base(taskID)}/printed`, "PUT", { ids }); }
export function searchPriceTagProducts(taskID: number, query: string) { return rmsRequest<PriceTagProduct[]>(`${base(taskID)}/products?${new URLSearchParams({ q: query })}`); }

