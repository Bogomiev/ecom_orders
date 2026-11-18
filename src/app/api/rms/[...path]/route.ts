import { authError, proxyRMS, requireSession } from "@/server/rms/client";

type Context = { params: Promise<{ path: string[] }> };
const taskRoutes: [RegExp, string[]][] = [[/^tasks\/types$/, ["GET"]], [/^tasks\/manual$/, ["POST"]], [/^tasks\/[1-9]\d*\/stoppers$/, ["GET"]], [/^tasks\/[1-9]\d*\/stoppers\/check$/, ["PUT"]]];
const stopperRoutes: [RegExp, string[]][] = [[/^stoppers$/, ["GET", "POST"]], [/^stoppers\/[1-9]\d*$/, ["PUT", "DELETE"]], [/^stoppers\/positions$/, ["GET", "POST"]], [/^stoppers\/positions\/(stopper|period)$/, ["PUT"]], [/^stoppers\/products$/, ["GET"]]];
async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  const resource = path.join("/");
  const adminStores = (resource === "admin/stores" && request.method === "GET") ||
    (/^admin\/stores\/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(resource) && request.method === "PUT");
  if (adminStores) {
    const error = await requireSession(request, true);
    if (error) return error;
    return proxyRMS(request, resource === "admin/stores" ? "/admin/stores/" : `/${resource}`);
  }
  if (!((/^task_types\/[1-9]\d*\/generate$/.test(resource) && request.method === "POST") || (resource === "tasks/current" && request.method === "GET") || (/^tasks\/[1-9]\d*\/(start|cancel|complete)$/.test(resource) && request.method === "POST") || (/^(users|roles|positions|task_types|task_scheduling|tasks|task_status_history)(\/[1-9]\d*)?$/.test(resource) && ["GET", "POST", "PUT", "DELETE"].includes(request.method) && (!resource.includes("/") ? ["GET","POST"].includes(request.method) : ["GET","PUT","DELETE"].includes(request.method))) || (["products","stores"].includes(resource) && request.method === "GET") || [...taskRoutes, ...stopperRoutes].some(([pattern, methods]) => pattern.test(resource) && methods.includes(request.method)))) return authError(404, 1, "Метод RMS не найден");
  const error = await requireSession(request);
  if (error) return error;
  return proxyRMS(request, `/${resource}${["users","roles","positions","task_types","task_scheduling","tasks","task_status_history","stoppers"].includes(resource) ? "/" : ""}${new URL(request.url).search}`);
}
export const GET = handle;
export const POST = handle;

export const PUT = handle;
export const DELETE = handle;
