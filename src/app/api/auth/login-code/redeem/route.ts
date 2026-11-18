import { proxyRMS } from "@/server/rms/client";
// A phone spends a QR login code; RMS sets the session cookies like on a PIN login.
export async function POST(request: Request) {
  return proxyRMS(request, "/auth/login_code/redeem", true);
}
