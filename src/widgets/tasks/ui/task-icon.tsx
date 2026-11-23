import { TaskService } from "@/entities/task/api";

// Task icons share the style of the «Товары» column: a line icon on a tinted square in the column color.
const paths: Record<string, React.ReactNode> = {
 [TaskService.Stoppers]: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
 [TaskService.PricePrint]: <><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></>,
 [TaskService.CashCollection]: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 10v4M18 10v4" /></>,
};
const defaultPath = <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 12.5l2 2 4-4" /></>;

export function TaskIcon({ service }: { service: string }) {
 return <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-purple-100 text-purple-700">
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{paths[service] ?? defaultPath}</svg>
 </span>;
}

// The tile of a task: like the «Товары» buttons, on the panel surface with a hover in the column color.
export const taskTileClass = "app-border app-surface-muted app-text flex w-full items-center gap-3 rounded-xl border text-left text-sm font-extrabold transition hover:border-purple-400 hover:bg-purple-50";
