import { authError, proxyRMS, requireSession } from "@/server/rms/client";

type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  const resource = path.join("/");
  if (!["products", "stores", "users"].includes(resource) || (request.method !== "GET" && !(request.method === "POST" && resource === "users"))) return authError(404, 1, "Метод RMS не найден");
  const error = await requireSession(request);
  if (error) return error;
  return proxyRMS(request, `/${resource}${resource === "users" ? "/" : ""}${new URL(request.url).search}`);
}
export const GET = handle;
export const POST = handle;
