import { requireSession } from "@/server/rms/client";
import { NextResponse } from "next/server";
import { ProductsResponseSchema } from "@/entities/product";
import { fetchOneCJson } from "@/server/one-c/client";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
const revalidate = 900;
const PRODUCTS_CACHE_TAG = "products-catalog";

export async function GET(request: Request) {
  const authError = await requireSession(request);
  if (authError) return authError;
  const shouldRefresh =
    new URL(request.url).searchParams.get("refresh") === "1";

  try {
    const products = await fetchOneCJson(
      "/GetGoods",
      ProductsResponseSchema,
      shouldRefresh
        ? { cache: "no-store" }
        : { next: { revalidate, tags: [PRODUCTS_CACHE_TAG] } }
    );

    if (shouldRefresh) {
      revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });
    }

    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Failed to load products from 1C", error);

    return NextResponse.json(
      { message: "Не удалось получить список товаров из 1С" },
      { status: 502 }
    );
  }
}
