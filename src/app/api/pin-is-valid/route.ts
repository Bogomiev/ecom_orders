import { NextRequest, NextResponse } from "next/server";
import { ONE_C_API_URL } from "@/server/one-c/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin")?.trim();

  if (!pin) {
    return NextResponse.json(
      { message: "Не указан PIN" },
      { status: 400 }
    );
  }

  try {
    const url = `${ONE_C_API_URL.replace(/\/+$/, "")}/pinIsValid?${new URLSearchParams({ pin })}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: request.signal
    });

    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("Failed to validate PIN in 1C", error);
    return NextResponse.json(
      { message: "Не удалось проверить PIN" },
      { status: 502 }
    );
  }
}
