import { NextResponse } from "next/server";
import {
  CancelOrderRequestSchema,
  CancelOrderResponseSchema,
  type CancelOrderResponse
} from "@/entities/order";
import { fetchOneCResponse } from "@/server/one-c/client";

export async function POST(request: Request) {
  const parsedBody = CancelOrderRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        code: 0,
        mess: "Некорректные параметры отмены заказа",
        data: { order: "", status: "Неизвестен", seller: "" }
      } satisfies CancelOrderResponse,
      { status: 400 }
    );
  }

  try {
    const response = await fetchOneCResponse(
      "/CancelOrder",
      CancelOrderResponseSchema,
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
    console.error("Failed to cancel order in 1C", error);

    return NextResponse.json(
      {
        code: 0,
        mess: "Не удалось отменить заказ в 1С",
        data: { order: "", status: "Неизвестен", seller: "" }
      } satisfies CancelOrderResponse,
      { status: 502 }
    );
  }
}
