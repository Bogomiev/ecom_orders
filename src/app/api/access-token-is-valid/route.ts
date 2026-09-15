import { NextRequest, NextResponse } from "next/server";
import { authError, fetchRMS } from "@/server/rms/client";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token || token.length > 255) return authError(400, 1, "Не указан токен доступа");
  try {
    const response = await fetchRMS(`/usertokenvalid?${new URLSearchParams({ token })}`);
    return new NextResponse(null, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return authError(502, 1, "Не удалось проверить токен доступа в RMS"); }
}
