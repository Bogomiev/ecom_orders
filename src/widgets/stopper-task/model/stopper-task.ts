// doc_id is the 1C promotion document; it is null for a product added by hand.
// remove marks a stopper whose period ended: the store takes it off the shelf.
export type StopperTaskItem = { doc_id: string | null; product_id: string; code: string; name: string; thermal_mode: boolean; unit: string; stopper: string; stopper_color: string; from: string; to: string | null; remove: boolean; stock: string | null; price: string | null; promo_price: string | null; barcode: string; result: "" | "ok" | "bad" | "removed" };
export type StopperTask = { task_id: number; status: "new" | "in_progress" | "completed" | "cancelled"; start: string; store_id: string; store_code: string; store_name: string; store_address: string; items: StopperTaskItem[] };
export type StopperTaskFilter = "all" | "todo" | "bad" | "rm";
export type StopperTaskGroup = { thermal: boolean; check: StopperTaskItem[]; remove: StopperTaskItem[] };

// Groups follow the 1C thermal mode flag: refrigerators and freezers first, then the shelf.
const thermalOrder = [true, false];

export function stopperTaskItemID(v: Pick<StopperTaskItem, "doc_id" | "product_id">) { return `${v.doc_id ?? "manual"}:${v.product_id}`; }
export function stockValue(v: Pick<StopperTaskItem, "stock">) { const n = Number(v.stock ?? 0); return Number.isFinite(n) ? n : 0; }
export function formatStock(v: Pick<StopperTaskItem, "stock" | "unit">) {
 const n = stockValue(v);
 return n > 0 ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(n)} ${v.unit}` : "нет";
}
// The printed sheet names a product by the last 5 digits of its code: «ЦБ-00000988» → «00988».
export function shortCode(code: string) { return code.replace(/\D/g, "").slice(-5); }
export function formatDayMonth(value: string) { return `${value.slice(8, 10)}.${value.slice(5, 7)}`; }
export function formatTaskStart(value: string) { return `${formatDayMonth(value)} в ${value.slice(11, 16)}`; }

// Without "all", stoppers to check include only products in stock; ended stoppers are always listed.
export function stopperTaskCounts(items: StopperTaskItem[], all: boolean) {
 const check = items.filter(v => !v.remove), base = all ? check : check.filter(v => stockValue(v) > 0), remove = items.filter(v => v.remove);
 return { inStock: check.filter(v => stockValue(v) > 0).length, total: check.length, base: base.length, done: base.filter(v => v.result).length, ok: base.filter(v => v.result === "ok").length, bad: base.filter(v => v.result === "bad").length, remove: remove.length, removeLeft: remove.filter(v => !v.result).length };
}
// Search finds a product by name, code or barcode.
export function matchesQuery(v: Pick<StopperTaskItem, "code" | "name" | "barcode">, query: string) {
 const q = query.trim().toLocaleLowerCase("ru");
 return !q || v.name.toLocaleLowerCase("ru").includes(q) || v.code.toLocaleLowerCase("ru").includes(q) || v.barcode.includes(q);
}
// The task is done when every product in stock matches and every ended stopper is removed;
// a price tag sent to print still has to be put on the shelf and confirmed.
export function stopperTaskDone(items: StopperTaskItem[]) {
 return items.every(v => v.remove ? v.result === "removed" : stockValue(v) <= 0 || v.result === "ok");
}
// Positions still to do: products in stock not matching yet (unchecked or sent to print) and ended stoppers not removed.
export function stopperTaskLeft(items: StopperTaskItem[]) {
 return items.filter(v => v.remove ? v.result !== "removed" : stockValue(v) > 0 && v.result !== "ok").length;
}
export function visibleStopperTaskItems(items: StopperTaskItem[], { all, query, filter }: { all: boolean; query: string; filter: StopperTaskFilter }) {
 let check = filter === "rm" ? [] : items.filter(v => !v.remove && (all || stockValue(v) > 0) && matchesQuery(v, query));
 let remove = filter === "bad" ? [] : items.filter(v => v.remove && matchesQuery(v, query));
 if (filter === "todo") { check = check.filter(v => !v.result); remove = remove.filter(v => !v.result); }
 if (filter === "bad") check = check.filter(v => v.result === "bad");
 return { check, remove };
}
// Ended stoppers go first in a group, earliest end first.
export function groupStopperTaskItems(check: StopperTaskItem[], remove: StopperTaskItem[]): StopperTaskGroup[] {
 return thermalOrder.map(thermal => ({
  thermal,
  check: check.filter(v => v.thermal_mode === thermal).sort((a, b) => a.name.localeCompare(b.name, "ru")),
  remove: remove.filter(v => v.thermal_mode === thermal).sort((a, b) => (a.to ?? "").localeCompare(b.to ?? "") || a.name.localeCompare(b.name, "ru"))
 })).filter(g => g.check.length || g.remove.length);
}
// An A4 sheet holds this many rows; the last sheet is filled with blank rows for notes.
export const rowsPerSheet = 34;
export function paginate<T>(rows: T[], size = rowsPerSheet): T[][] {
 const pages: T[][] = [];
 for (let i = 0; i < rows.length; i += size) pages.push(rows.slice(i, i + size));
 return pages.length ? pages : [[]];
}
export function sheetsLabel(n: number) {
 const tail = n % 10, tens = n % 100;
 return `${n} ${tail === 1 && tens !== 11 ? "лист" : tail >= 2 && tail <= 4 && (tens < 12 || tens > 14) ? "листа" : "листов"}`;
}
