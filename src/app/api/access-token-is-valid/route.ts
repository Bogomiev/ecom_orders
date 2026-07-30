import { NextRequest, NextResponse } from "next/server";
import { ONE_C_API_URL } from "@/server/one-c/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(
      { message: "Не указан токен доступа" },
      { status: 400 }
    );
  }

  try {
    const url = `${ONE_C_API_URL.replace(/\/+$/, "")}/accessTokenIsValid?${new URLSearchParams({ token })}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: request.signal
    });

    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("Failed to validate access token in 1C", error);
    return NextResponse.json(
      { message: "Не удалось проверить токен доступа" },
      { status: 502 }
    );
  }
}
