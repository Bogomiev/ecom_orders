import { NextResponse } from "next/server";
import {
  ConfirmOrderRequestSchema,
  OrderActionResponseSchema,
  type ConfirmOrderResponse
} from "@/entities/order";
import { fetchOneCResponse } from "@/server/one-c/client";

export async function POST(request: Request) {
  const parsedBody = ConfirmOrderRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        code: 0,
        mess: "Некорректные параметры подтверждения заказа",
        data: { order: "", status: "Неизвестен", seller: "" }
      } satisfies ConfirmOrderResponse,
      { status: 400 }
    );
  }

  try {
    const response = await fetchOneCResponse("/ConfirmOrder", OrderActionResponseSchema, {
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
    console.error("Failed to confirm order in 1C", error);

    return NextResponse.json(
      {
        code: 0,
        mess: "Не удалось подтвердить заказ в 1С",
        data: { order: "", status: "Неизвестен", seller: "" }
      } satisfies ConfirmOrderResponse,
      { status: 502 }
    );
  }
}
