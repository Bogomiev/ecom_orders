import { authenticatedFetch } from "@/shared/api/auth";

export enum TaskService {
 CashCollection = "cash_collection",
 PricePrint = "price_print",
 WithoutService = "without_service",
}
export const taskServiceLabels: Record<TaskService, string> = {
 [TaskService.CashCollection]: "Инкассация",
 [TaskService.PricePrint]: "Печать ценников",
 [TaskService.WithoutService]: "Отсутствует",
};
export type TaskType = { id: number; name: string; short_name: string; service: TaskService; icon: string | null; color: string; color_dark: string; is_active: boolean; sort_order: number };
export type Schedule = { id: number; task_type_id: number; frequency: number; period_from: string; period_to: string; days: number[]; time: string; is_active: boolean; stores: string[] };
export type TaskTypeInput = Omit<TaskType, "id">;
export type ScheduleInput = Omit<Schedule, "id">;
export async function rmsRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
 const response = await authenticatedFetch(`/api/rms/${path}`, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
 const data = await response.json();
 if (!response.ok) throw new Error(response.status === 409 ? "Запись используется в связанных таблицах или такое имя уже существует." : response.status === 400 ? "Проверьте заполнение полей." : data.messages?.join("\n") || "Ошибка RMS");
 return data.data;
}
export async function rmsList<T>(resource: string, filters = ""): Promise<T[]> {
 const out: T[] = [];
 for (let offset = 0; ; offset += 100) {
  const page = await rmsRequest<T[]>(`${resource}?limit=100&offset=${offset}${filters ? `&${filters}` : ""}`);
  out.push(...page);
  if (page.length < 100) return out;
 }
}
export function typeInput(v: TaskType): TaskTypeInput {
 const { name, short_name, service, icon, color, color_dark, is_active, sort_order } = v;
 return { name, short_name, service, icon, color, color_dark, is_active, sort_order };
}
export function scheduleInput(v: Schedule): ScheduleInput {
 const { task_type_id, frequency, period_from, period_to, days, time, is_active, stores } = v;
 return { task_type_id, frequency, period_from, period_to, days, time, is_active, stores };
}
