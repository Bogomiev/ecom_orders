import { handleFiles } from "@/server/rms/files";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return handleFiles(request, (await context.params).id);
}
export const PUT = GET;
export const DELETE = GET;
