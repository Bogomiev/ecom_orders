import { NextResponse } from "next/server";
import type { Store, StoresResponse } from "@/entities/store";

const STORE_RECORDS = [
  {
    code: "warehouse",
    id: "4h4bve3pp13brab",
    name: "Интернет-магазин МСК",
    uid_1c: "e58968dd-708d-11e8-b7e5-001dd8b89db0",
    raw: {
      address: {
        text: "ул. Малая Калужская, д. 15, стр. 18"
      },
      contact: "Склад РЦ"
    }
  }
] as const;

const MOCK_STORES: Store[] = STORE_RECORDS.map((store) => ({
  id: store.id,
  code: store.code,
  name: store.name,
  uid_1c: store.uid_1c,
  address: store.raw.address.text,
  contact: store.raw.contact
}));

export async function GET() {
  const response: StoresResponse = {
    page: 1,
    perPage: MOCK_STORES.length,
    totalPages: 1,
    totalItems: MOCK_STORES.length,
    items: MOCK_STORES
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
