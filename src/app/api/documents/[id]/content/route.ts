import { NextResponse } from "next/server";
import { authError, fetchRMS, requireSession, rmsHeaders } from "@/server/rms/client";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const error = await requireSession(request);
  if (error) return error;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return authError(400, 1, "Некорректный ID файла");
  try {
    const response = await fetchRMS(`/files/${id}/content`, { headers: rmsHeaders(request), signal: AbortSignal.timeout(120_000) });
    if (response.status === 404) {
      if (!response.headers.get("Content-Type")?.includes("application/json")) {
        return authError(502, 1, "Сервис RMS не поддерживает просмотр файлов. Обновите и перезапустите RMS.");
      }
      const metadata = await fetchRMS(`/files/${id}`, { headers: rmsHeaders(request) });
      if (metadata.ok) {
        const entry = await metadata.json();
        if (entry.is_file && !entry.deleted_at) return authError(404, 1, "Запись документа найдена, но содержимое отсутствует в хранилище. Загрузите файл заново в админке.");
      }
      return authError(404, 1, "Документ удалён или не найден");
    }
    if (!response.ok) return authError(response.status, response.status === 401 ? 1003 : 1, "Не удалось загрузить документ из RMS");
    const type = response.headers.get("Content-Type") ?? "application/octet-stream";
    if (!/^(application\/pdf|text\/html)(;|$)/i.test(type)) return authError(415, 1, "Поддерживаются только PDF и HTML");
    return new NextResponse(response.body, { headers: {
      "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"
    } });
  } catch { return authError(502, 1, "Не удалось загрузить документ из RMS"); }
}
