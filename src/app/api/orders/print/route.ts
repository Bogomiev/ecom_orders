import { NextResponse } from "next/server";
import { ONE_C_API_URL } from "@/server/one-c/client";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { message: "Не указан идентификатор заказа" },
      { status: 400 }
    );
  }

  try {
    const url = new URL(`${ONE_C_API_URL.replace(/\/+$/, "")}/PrintOrder`);
    url.searchParams.set("id", id);
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(90_000)
    });
    let body = await response.text();

    // 1С может вернуть строку как JSON-значение с окружающими кавычками.
    if (body.trim().startsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(body);
        if (typeof parsed === "string") body = parsed;
      } catch {
        // Возвращаем исходное тело: клиент покажет ошибку, если это не PDF.
      }
    }

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("Failed to load printable order PDF from 1C", error);
    return NextResponse.json(
      { message: "Не удалось получить печатную форму заказа из 1С" },
      { status: 502 }
    );
  }
}
