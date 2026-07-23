import { NextResponse } from "next/server";
import type {
  CompleteOrderRequest,
  CompleteOrderResponse
} from "@/entities/order";
import { ONE_C_API_URL } from "@/server/one-c/client";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompleteOrderRequest;
    const response = await fetch(`${ONE_C_API_URL}/CompleteOrder`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });
    const data = (await response.json()) as CompleteOrderResponse;

    return NextResponse.json(data, { status: response.status });
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
