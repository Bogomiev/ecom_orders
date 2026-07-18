import { NextResponse } from "next/server";
import type {
  ConfirmOrderRequest,
  ConfirmOrderResponse
} from "@/entities/order";
import { ONE_C_API_URL } from "@/server/one-c/client";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConfirmOrderRequest;
    const response = await fetch(`${ONE_C_API_URL}/ConfirmOrder`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });
    const data = (await response.json()) as ConfirmOrderResponse;

    return NextResponse.json(data, { status: response.status });
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
