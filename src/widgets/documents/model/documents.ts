import type { FileEntry } from "@/entities/file/api/files";
export const FRESH_DAYS = 14;
export function isFresh(entry: FileEntry, now = Date.now()) {
  const age = now - Date.parse(entry.updated_at);
  return age >= 0 && age <= FRESH_DAYS * 86400000;
}
export function folderPath(entry: FileEntry, entries: FileEntry[]) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const path: FileEntry[] = [];
  const seen = new Set([entry.id]);
  let parent = entry.parent_id;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const folder = byId.get(parent);
    if (!folder) break;
    path.unshift(folder); parent = folder.parent_id;
  }
  return path;
}
export function filesInFolder(entries: FileEntry[], folder: string | null, query = "", fresh = false) {
  const q = query.trim().toLocaleLowerCase();
  return entries.filter(e => e.is_file && !e.deleted_at && /\.(pdf|html)$/i.test(e.name) &&
    (!folder || folderPath(e, entries).some(p => p.id === folder)) &&
    (!fresh || isFresh(e)) && (!q || e.name.toLocaleLowerCase().includes(q)));
}

export function documentTitle(name: string) {
  return name.replace(/\.(pdf|html)$/i, "");
}
