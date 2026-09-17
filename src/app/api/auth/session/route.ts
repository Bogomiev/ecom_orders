import { proxyRMS } from "@/server/rms/client";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return proxyRMS(request, "/auth/session");
}
