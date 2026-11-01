import { authError, proxyRMS, requireSession } from "@/server/rms/client";

type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  const resource = path.join("/");
  if (!((/^(users|roles|positions|task_types|task_scheduling|tasks|task_status_history)(\/[1-9]\d*)?$/.test(resource) && ["GET", "POST", "PUT", "DELETE"].includes(request.method) && (!resource.includes("/") ? ["GET","POST"].includes(request.method) : ["GET","PUT","DELETE"].includes(request.method))) || (["products","stores"].includes(resource) && request.method === "GET"))) return authError(404, 1, "Метод RMS не найден");
  const error = await requireSession(request);
  if (error) return error;
  return proxyRMS(request, `/${resource}${["users","roles","positions","task_types","task_scheduling","tasks","task_status_history"].includes(resource) ? "/" : ""}${new URL(request.url).search}`);
}
export const GET = handle;
export const POST = handle;

export const PUT = handle;
export const DELETE = handle;
