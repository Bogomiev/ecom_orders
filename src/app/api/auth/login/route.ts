import { proxyRMS } from "@/server/rms/client";
export async function POST(request: Request) {
  return proxyRMS(request, "/auth/login", true);
}
