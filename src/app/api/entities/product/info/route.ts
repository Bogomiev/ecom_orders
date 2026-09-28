import { authError, proxyRMS, requireSession } from "@/server/rms/client";

export async function GET(request: Request) {
  const error = await requireSession(request);
  if (error) return error;
  const params = new URL(request.url).searchParams;
  const storeId = params.get("store_id")?.trim();
  const fields = ["product_id", "code", "name"].filter((field) => params.get(field)?.trim());
  if (!storeId || fields.length !== 1) return authError(400, 1, "Укажите магазин и одно условие поиска товара");
  const field = fields[0];
  const query = new URLSearchParams({ store_id: storeId, [field]: params.get(field)!.trim() });
  return proxyRMS(request, `/product_info?${query}`);
}
