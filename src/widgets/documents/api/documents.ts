import { authenticatedFetch } from "@/shared/api/auth";
import type { FileEntry } from "@/entities/file/api/files";

async function check(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.messages?.join("\n") || error?.error || "Не удалось загрузить документы");
  }
  return response;
}
export const documentsService = {
  async list(signal?: AbortSignal): Promise<FileEntry[]> {
    const visited = new Set<string>();
    async function read(parent: string | null): Promise<FileEntry[]> {
      const response = await check(await authenticatedFetch(`/api/documents${parent ? `?parent_id=${encodeURIComponent(parent)}` : ""}`, { signal }));
      const entries = ((await response.json()) ?? []) as FileEntry[];
      const active = entries.filter(e => !e.deleted_at);
      const descendants = await Promise.all(active.filter(e => !e.is_file && !visited.has(e.id)).map(e => {
        visited.add(e.id); return read(e.id);
      }));
      return [...active, ...descendants.flat()];
    }
    return read(null);
  },
  async content(entry: FileEntry, signal?: AbortSignal) {
    const response = await check(await authenticatedFetch(`/api/documents/${entry.id}/content`, { signal }));
    const bytes = await response.arrayBuffer();
    return new Blob([bytes], { type: /\.pdf$/i.test(entry.name) ? "application/pdf" : "text/html;charset=utf-8" });
  }
};
