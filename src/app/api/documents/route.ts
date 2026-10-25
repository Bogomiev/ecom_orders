import { authError, proxyRMS, requireSession } from "@/server/rms/client";
export async function GET(request: Request) {
  const error = await requireSession(request);
  if (error) return error;
  const parent = new URL(request.url).searchParams.get("parent_id");
  if (parent && !/^[0-9a-f-]{36}$/i.test(parent)) return authError(400, 1, "Некорректный ID каталога");
  return proxyRMS(request, `/files/${parent ? `?parent_id=${encodeURIComponent(parent)}` : ""}`);
}
