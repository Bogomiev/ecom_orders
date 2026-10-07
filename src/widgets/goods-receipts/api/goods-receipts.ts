import { GoodsReceiptsResponseSchema, InvoiceActionResponseSchema, type ConfirmInvoiceRequest } from "@/entities/goods-receipt";
import { authenticatedFetch } from "@/shared/api/auth";
import { fetchJson } from "@/shared/api/fetch-json";

export const GOODS_RECEIPTS_SERVICE_PATH = "/api/goods-receipts";
export const GOODS_RECEIPTS_HISTORY_DAYS = 30;

export async function fetchGoodsReceipts(store: string, signal?: AbortSignal, historyDays = GOODS_RECEIPTS_HISTORY_DAYS) {
  const query = new URLSearchParams({ store, historyDays: String(historyDays) });
  const response = await fetchJson(`${GOODS_RECEIPTS_SERVICE_PATH}?${query}`, GoodsReceiptsResponseSchema, {
    cache: "no-store", signal
  });
  return response.data;
}

export function confirmInvoice(body: ConfirmInvoiceRequest) {
  return fetchJson(`${GOODS_RECEIPTS_SERVICE_PATH}/confirm`, InvoiceActionResponseSchema, {
    acceptErrorResponse: true,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function printInvoice(id: string) {
  const response = await authenticatedFetch(`${GOODS_RECEIPTS_SERVICE_PATH}/print?${new URLSearchParams({ id })}`, {
    cache: "no-store", headers: { Accept: "text/plain" }
  });
  if (!response.ok) throw new Error(`Не удалось получить печатную форму. Статус: ${response.status}`);
  const base64 = (await response.text()).trim();
  const normalized = base64.replace(/^data:application\/pdf;base64,/i, "").replace(/\s/g, "");
  if (!normalized || !atob(normalized).startsWith("%PDF-")) throw new Error("Сервер вернул некорректную печатную форму");
  return base64;
}
