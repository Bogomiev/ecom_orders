import { NextResponse } from "next/server";
import type { ProductsResponse } from "@/entities/product";
import mockProducts from "@/shared/api/mock-data/products.json";

const MOCK_PRODUCTS = mockProducts satisfies ProductsResponse;

export const revalidate = 900;

export async function GET() {
  return NextResponse.json(MOCK_PRODUCTS, {
    headers: {
      "Cache-Control": "s-maxage=900, stale-while-revalidate=60"
    }
  });
}
