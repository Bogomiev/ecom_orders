import { requireSession } from "@/server/rms/client";
import { NextResponse } from "next/server";
import { ProductsResponseSchema } from "@/entities/product";
import { fetchOneCJson } from "@/server/one-c/client";

export const dynamic = "force-dynamic";
const PRODUCTS_CACHE_TTL_MS = 15 * 60 * 1_000;

type Products = Awaited<ReturnType<typeof loadProducts>>;

let cachedProducts: { data: Products; expiresAt: number } | undefined;
let pendingProducts: Promise<Products> | undefined;

async function loadProducts() {
  // The full catalog can exceed the Next.js Data Cache entry limit.
  const data = await fetchOneCJson("/GetGoods", ProductsResponseSchema, {
    cache: "no-store"
  });
  cachedProducts = { data, expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS };
  return data;
}

function getProducts(refresh: boolean) {
  if (pendingProducts) return pendingProducts;
  if (!refresh && cachedProducts && Date.now() < cachedProducts.expiresAt) {
    return cachedProducts.data;
  }

  pendingProducts = loadProducts().finally(() => {
    pendingProducts = undefined;
  });
  return pendingProducts;
}

export async function GET(request: Request) {
  const authError = await requireSession(request);
  if (authError) return authError;
  const shouldRefresh =
    new URL(request.url).searchParams.get("refresh") === "1";

  try {
    const products = await getProducts(shouldRefresh);

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
