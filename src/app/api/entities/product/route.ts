import { NextResponse } from "next/server";
import type { ProductsResponse } from "@/entities/product";
import { fetchOneCJson } from "@/server/one-c/client";

export const revalidate = 900;

export async function GET() {
  try {
    const products = await fetchOneCJson<ProductsResponse>("/GetGoods", {
      next: { revalidate }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to load products from 1C", error);

    return NextResponse.json(
      { message: "Не удалось получить список товаров из 1С" },
      { status: 502 }
    );
  }
}
