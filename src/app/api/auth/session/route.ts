import { NextRequest, NextResponse } from "next/server";
import { proxyRMS } from "@/server/rms/client";
import { verifyAccessToken } from "@/server/rms/security";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const response = await proxyRMS(request, "/auth/session");
  if (!response.ok) return response;
  const claims = verifyAccessToken(new NextRequest(request.url, { headers: request.headers }).cookies.get("access_token")?.value);
  const body = await response.json();
  return NextResponse.json({ ...body, role: body.data?.role ?? body.data?.user?.role ?? (claims?.is_admin === true ? "admin" : "user") }, { headers: response.headers });
}
