import { NextResponse } from "next/server";
import {
  GiveOrderToCourierRequestSchema,
  GiveOrderToCourierResponseSchema,
  type GiveOrderToCourierResponse
} from "@/entities/order";
import { fetchOneCResponse } from "@/server/one-c/client";

export async function POST(request: Request) {
  const parsedBody = GiveOrderToCourierRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        code: 0,
        mess: "Некорректные параметры выдачи заказа курьеру",
        data: { order: "", status: "Неизвестен", seller: "" }
      } satisfies GiveOrderToCourierResponse,
      { status: 400 }
    );
  }

  try {
    const response = await fetchOneCResponse(
      "/GiveOrderToCourier",
      GiveOrderToCourierResponseSchema,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsedBody.data),
        cache: "no-store"
      }
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    console.error("Failed to give order to courier in 1C", error);

    return NextResponse.json(
      {
        code: 0,
        mess: "Не удалось выдать заказ курьеру в 1С",
        data: { order: "", status: "Неизвестен", seller: "" }
      } satisfies GiveOrderToCourierResponse,
      { status: 502 }
    );
  }
}
