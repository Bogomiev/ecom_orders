import { NextResponse } from "next/server";
import {
  CancelOrderItemRequestSchema,
  CancelOrderItemResponseSchema
} from "@/entities/order";
import { fetchOneCResponse } from "@/server/one-c/client";

export async function POST(request: Request) {
  const parsedBody = CancelOrderItemRequestSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsedBody.success) {
    return NextResponse.json(
      { code: 0, mess: "Некорректные параметры отмены товара" },
      { status: 400 }
    );
  }

  try {
    const response = await fetchOneCResponse(
      "/CancelOrderItem",
      CancelOrderItemResponseSchema,
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
    console.error("Failed to cancel order item in 1C", error);
    return NextResponse.json(
      { code: 0, mess: "Не удалось отменить товар в 1С" },
      { status: 502 }
    );
  }
}
