import { z, type ZodType } from "zod";
import { authenticatedFetch } from "@/shared/api/auth";
import { returnListSchema, returnRequestSchema, returnStatusResponseSchema, type ReturnItem } from "../model/return-request";

const path = "/api/rms/return_request";
const upstreamErrorSchema = z.object({ mess: z.string().trim().min(1) });
const errorSchema = z.object({ messages: z.array(z.string()).optional() });

async function request<T>(url: string, schema: ZodType<T>, init?: RequestInit) {
  const response = await authenticatedFetch(url, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const upstreamError = upstreamErrorSchema.safeParse(body);
    if (upstreamError.success) throw new Error(upstreamError.data.mess);
    const result = errorSchema.safeParse(body);
    const message = result.data?.messages?.[0];
    if (response.status === 409) throw new Error("Заявка уже существует, ожидает обработки или её статус изменился. Обновите список.");
    throw new Error(message || "Не удалось выполнить запрос в RMS");
  }
  return z.object({ resultCode: z.literal(0), data: schema }).parse(body).data;
}

export function fetchReturnList(storeId: string, historyDays: number, signal: AbortSignal) {
  const query = new URLSearchParams({ store_id: storeId, history_days: String(historyDays) });
  return request(`${path}?${query}`, returnListSchema, { signal, cache: "no-store" });
}

function requestUrl(storeId: string, suffix = "") {
  return `${path}${suffix}?${new URLSearchParams({ store_id: storeId })}`;
}

export function fetchReturnRequest(storeId: string, id: string, signal?: AbortSignal) {
  return request(requestUrl(storeId, `/${id}`), returnRequestSchema, { signal, cache: "no-store" });
}

export function fetchReturnRequestStatus(storeId: string, id: string, signal: AbortSignal) {
  return request(requestUrl(storeId, `/${id}/status`), returnStatusResponseSchema, { signal, cache: "no-store" });
}

export function saveReturnRequest(storeId: string, id: string, existing: boolean, seller: string, items: ReturnItem[]) {
  return request(requestUrl(storeId, existing ? `/${id}` : ""), returnRequestSchema, {
    method: existing ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, seller, items })
  });
}

export function cancelReturnRequest(storeId: string, id: string) {
  return request(requestUrl(storeId, `/${id}/status`), returnRequestSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "CANCELLED" })
  });
}
