import { requireSession } from "@/server/rms/client";
import { NextResponse } from "next/server";
import {
  GoodsReceiptsResponseSchema
} from "@/entities/goods-receipt";
import { fetchOneCJson } from "@/server/one-c/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await requireSession(request);
  if (authError) return authError;
  try {
    const requestSearchParams = new URL(request.url).searchParams;
    const storeId = requestSearchParams.get("store")?.trim();
    const requestedHistoryDays = Number(requestSearchParams.get("historyDays"));
    const historyDays = Number.isInteger(requestedHistoryDays) && requestedHistoryDays >= 1
      ? String(requestedHistoryDays)
      : null;
    const oneCSearchParams = new URLSearchParams();
    if (storeId) oneCSearchParams.set("store", storeId);
    if (historyDays) oneCSearchParams.set("historyDays", historyDays);
    const fetchPage = (page?: number) => {
      const pageSearchParams = new URLSearchParams(oneCSearchParams);
      if (page !== undefined) pageSearchParams.set("page", String(page));
      const query = pageSearchParams.toString();
      return fetchOneCJson(
        `/GetGoodsReceipts${query ? `?${query}` : ""}`,
        GoodsReceiptsResponseSchema,
        { cache: "no-store" }
      );
    };
    const firstPage = await fetchPage();
    const remainingPages = firstPage.totalPages > 1
      ? await Promise.all(
          Array.from(
            { length: firstPage.totalPages - 1 },
            (_, index) => fetchPage(index + 2)
          )
        )
      : [];
    const data = {
      ...firstPage,
      page: 1,
      perPage: firstPage.totalItems,
      totalPages: 1,
      items: [firstPage, ...remainingPages].flatMap((page) => page.items)
    };


    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Failed to load goods receipts from 1C", error);

    return NextResponse.json(
      { message: "Не удалось получить приемки из 1С" },
      { status: 502 }
    );
  }
}
