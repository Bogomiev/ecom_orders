import { proxyRMS, requireSession } from "@/server/rms/client";
export async function POST(request: Request) {
  const error = await requireSession(request);
  return error ?? proxyRMS(request, "/auth/logout");
}
