import { proxyRMS, requireSession } from "@/server/rms/client";
// A signed-in user asks RMS for a one-time QR login code; session cookies and CSRF go along.
export async function POST(request: Request) {
  const error = await requireSession(request);
  return error ?? proxyRMS(request, "/auth/login_code", true);
}
