import { NextResponse } from "next/server";
import {
  CompleteOrderRequestSchema,
  OrderActionResponseSchema,
  type CompleteOrderResponse
} from "@/entities/order";
import { fetchOneCResponse } from "@/server/one-c/client";

export async function POST(request: Request) {
  const parsedBody = CompleteOrderRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        code: 0,
        mess: "Некорректные параметры завершения заказа",
        data: { order: "", status: "Неизвестен", seller: "" }
      } satisfies CompleteOrderResponse,
      { status: 400 }
    );
  }

  try {
    const response = await fetchOneCResponse("/CompleteOrder", OrderActionResponseSchema, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parsedBody.data),
      cache: "no-store"
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    console.error("Failed to complete order in 1C", error);

    return NextResponse.json(
      {
        code: 0,
        mess: "Не удалось завершить контроль заказа в 1С",
        data: { order: "", status: "Неизвестен", seller: "" }
      } satisfies CompleteOrderResponse,
      { status: 502 }
    );
  }
}
