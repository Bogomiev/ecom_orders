import { NextResponse } from "next/server";
import { StoresResponseSchema } from "@/entities/store";
import { fetchOneCJson } from "@/server/one-c/client";

export const revalidate = 900;

export async function GET() {
  try {
    const stores = await fetchOneCJson("/GetStores", StoresResponseSchema, {
      next: { revalidate }
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("Failed to load stores from 1C", error);

    return NextResponse.json(
      { message: "Не удалось получить список магазинов из 1С" },
      { status: 502 }
    );
  }
}
