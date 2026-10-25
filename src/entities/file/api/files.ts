import { authenticatedFetch } from "@/shared/api/auth";
export type FileEntry = {
  id: string; name: string; priority: number; parent_id: string | null;
  is_file: boolean; icon: string | null; created_at: string; updated_at: string; deleted_at: string | null;
};
export type FileInput = Pick<FileEntry, "id" | "name" | "priority" | "parent_id" | "is_file" | "icon"> & { content?: string };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`/api/admin/files${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.messages?.join("\n") || error?.error || `Ошибка сервиса файлов (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json();
}
export const filesService = {
  list: (parent: string | null, deleted = false) => request<FileEntry[] | null>(`?${new URLSearchParams({ ...(parent ? { parent_id: parent } : {}), include_deleted: String(deleted) })}`).then(entries => entries ?? []),
  create: (input: FileInput) => request<FileEntry>("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
  update: (input: FileInput) => request<FileEntry>(`/${input.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
  delete: (id: string, permanent = false) => request<void>(`/${id}?marked=${!permanent}`, { method: "DELETE" })
};
export function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}
