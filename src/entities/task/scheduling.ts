export const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
// UTC date-only arithmetic avoids timezone and daylight-saving shifts.
export function weekBoundary(value: string, end: boolean): string {
 if (!value) return "";
 const date = new Date(`${value}T00:00:00Z`);
 if (Number.isNaN(date.getTime())) return "";
 const day = date.getUTCDay();
 date.setUTCDate(date.getUTCDate() + (end ? (7 - day) % 7 : -((day + 6) % 7)));
 return date.toISOString().slice(0, 10);
}
export function resizeDays(days: number[], frequency: number): number[] {
 return Array.from({ length: frequency * 7 }, (_, i) => days[i] === 1 ? 1 : 0);
}
export function describeDays(days: number[]): string {
 return Array.from({ length: Math.ceil(days.length / 7) }, (_, week) => {
  const selected = weekdays.filter((_, day) => days[week * 7 + day] === 1);
  return `${week + 1}: ${selected.join(", ") || "—"}`;
 }).join("; ");
}
