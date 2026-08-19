import { NextResponse } from "next/server";
import {
  normalizeOneCOrders,
  OneCOrdersResponseSchema
} from "@/entities/order";
import { fetchOneCJson } from "@/server/one-c/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
        `/GetOrders${query ? `?${query}` : ""}`,
        OneCOrdersResponseSchema,
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
    const orders = normalizeOneCOrders(data);

    return NextResponse.json(orders, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Failed to load orders from 1C", error);

    return NextResponse.json(
      { message: "Не удалось получить заказы из 1С" },
      { status: 502 }
    );
  }
}
