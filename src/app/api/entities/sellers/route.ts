import { NextResponse } from "next/server";
import type { SellersResponse } from "@/entities/seller";
import { fetchOneCJson } from "@/server/one-c/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sellerBarcode = new URL(request.url).searchParams.get("sellerBarcode")?.trim();

  if (!sellerBarcode) {
    return NextResponse.json(
      { message: "Штрихкод продавца не указан" },
      { status: 400 }
    );
  }

  try {
    const searchParams = new URLSearchParams({ sellerBarcode });
    const sellers = await fetchOneCJson<SellersResponse>(
      `Seller?${searchParams.toString()}`,
      { cache: "no-store" }
    );
    return NextResponse.json(sellers);
  } catch (error) {
    console.error("Failed to load seller from 1C", error);
    return NextResponse.json(
      { message: "Не удалось получить продавца из 1С" },
      { status: 502 }
    );
  }
}
