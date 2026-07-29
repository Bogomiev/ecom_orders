import { NextResponse } from "next/server";
import {
  normalizeOneCOrders,
  OneCOrdersResponseSchema
} from "@/entities/order";
import { fetchOneCJson } from "@/server/one-c/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const storeId = new URL(request.url).searchParams.get("store")?.trim();
    const searchParams = storeId
      ? `?${new URLSearchParams({ store: storeId })}`
      : "";
    const data = await fetchOneCJson(`/GetOrders${searchParams}`, OneCOrdersResponseSchema, {
      cache: "no-store"
    });
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
