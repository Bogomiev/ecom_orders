import { authError, fetchRMS, requireSession } from "@/server/rms/client";
import { NextResponse } from "next/server";
import { StoresResponseSchema } from "@/entities/store";
import { fetchOneCJson } from "@/server/one-c/client";

export const dynamic = "force-dynamic";
const revalidate = 900;

export async function GET(request: Request) {
  try {
    // Only the store list is accessible with a validated invitation, before PIN login.
    const token = request.headers.get("X-User-Token")?.trim();
    if (token) {
      if (token.length > 255) return authError(400, 1, "Недействительный токен доступа");
      const validation = await fetchRMS(`/usertokenvalid?${new URLSearchParams({ token })}`);
      if (!validation.ok) return authError(validation.status >= 500 ? 502 : 401, 1, "Не удалось проверить токен доступа");
    } else {
      const error = await requireSession(request);
      if (error) return error;
    }
    const stores = await fetchOneCJson("/GetStores", StoresResponseSchema, {
      next: { revalidate }
    });

    return NextResponse.json(stores, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load stores from 1C", error);

    return NextResponse.json(
      { message: "Не удалось получить список магазинов из 1С" },
      { status: 502 }
    );
  }
}
