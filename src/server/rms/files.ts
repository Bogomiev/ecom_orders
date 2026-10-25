import { FILE_FORMAT_ERROR, isAllowedFileName } from "../../entities/file/file-format";
import { NextRequest } from "next/server";
import { authError, proxyRMS, requireSession } from "./client";
import { verifyAccessToken } from "./security";

export async function handleFiles(request: Request, id?: string) {
  const error = await requireSession(request);
  if (error) return error;
  const claims = verifyAccessToken(new NextRequest(request.url, { headers: request.headers }).cookies.get("access_token")?.value);
  if (claims?.is_admin !== true) return authError(403, 1, "Доступ только для администратора");
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return authError(400, 1, "Некорректный ID");
  let input: Record<string, unknown> | undefined;
  if (["POST", "PUT"].includes(request.method)) {
    try { input = await request.clone().json(); }
    catch { return authError(400, 1, "Некорректное тело запроса"); }
    if (!input || typeof input !== "object") return authError(400, 1, "Некорректное тело запроса");
    if (input.is_file === true && (typeof input.name !== "string" || !isAllowedFileName(input.name))) {
      return authError(400, 1, FILE_FORMAT_ERROR);
    }
  }
  const response = await proxyRMS(request, `/files/${id ?? ""}${new URL(request.url).search}`, false, 120_000);
  // A write can commit before its response is lost (e.g. RMS WriteTimeout).
  // Confirm directory metadata by reading it back; never replay the write or
  // infer successful content uploads from metadata alone.
  if (request.method === "PUT" && id && input?.is_file === false && response.status >= 500) {
    const check = await proxyRMS(new Request(request.url, { headers: request.headers }), `/files/${id}`);
    if (check.ok) {
      const saved = await check.clone().json().catch(() => null);
      if (saved && saved.id === id && saved.is_file === false && saved.deleted_at == null &&
          saved.name === input.name && saved.priority === input.priority &&
          (saved.parent_id ?? null) === (input.parent_id ?? null) &&
          (saved.icon ?? null) === (input.icon ?? null)) return check;
    }
  }
  return response;
}
