// days is the duration of a stopper: setting it on a position ends the position on «с» + days, unless the
// position ends earlier; null keeps an open period. The period can still be changed by hand.
export type Stopper = { id: number; name: string; color: string; days: number | null; positions: number };
export type StopperInput = { name: string; color: string; days: number | null };
export const maxStopperDays = 365;
export function stopperDaysLabel(days: number | null) { return days ? `+${days} дн.` : "без срока"; }
// The duration field: empty is an open period, otherwise whole days from 1 to a year.
export function stopperDays(value: string): number | null | undefined {
 const text = value.trim();
 if (!text) return null;
 const days = Number(text);
 return Number.isInteger(days) && days >= 1 && days <= maxStopperDays ? days : undefined;
}
// Storage follows the 1C product flag isThermalMode: chilled or frozen goods versus the shelf.
export const storageModes = [
 { thermal: true, label: "Терморежим", icon: "❄︎", place: "Холодильник или морозильный ларь" },
 { thermal: false, label: "Без терморежима", icon: "▦", place: "Стеллаж" }
] as const;
export type StopperPrice = { store_id: string; price: string | null; promo_price: string | null };
// doc_id is the 1C promotion document; it is null for a product added by hand.
export type StopperPosition = { doc_id: string | null; product_id: string; code: string; name: string; thermal_mode: boolean; stopper_id: number | null; from: string; to: string | null; received: string; manual: boolean; stores: number; prices: StopperPrice[] };
export type StopperPositionKey = { doc_id: string | null; product_id: string };
export type StopperProduct = { id: string; code: string; name: string; added: boolean };
export type StopperTab = "nostop" | "stop" | "all" | "manual";
export type StopperSort = "stopper" | "storage";

export const stopperColors = ["#F2B705", "#E8731A", "#D7261E", "#C2185B", "#7B2FB0", "#1F5FBF", "#1F78B4", "#0B8A8F", "#1E9E4A", "#5D6D74"];
export const maxStopperNameLength = 24;
export const maxPriceStores = 4;

export function positionID(v: StopperPositionKey) { return `${v.doc_id ?? "manual"}:${v.product_id}`; }
export function positionKey(v: StopperPositionKey): StopperPositionKey { return { doc_id: v.doc_id, product_id: v.product_id }; }
export function storageMode(thermal: boolean) { return storageModes.find(v => v.thermal === thermal) ?? storageModes[1]; }

export function localDate(now = new Date()) {
 return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function addDays(date: string, days: number) {
 const value = new Date(`${date}T00:00:00Z`);
 value.setUTCDate(value.getUTCDate() + days);
 return value.toISOString().slice(0, 10);
}
// By default the page shows positions active from a week before to a week after today.
export function defaultWindow(today: string) { return { from: addDays(today, -7), to: addDays(today, 7) }; }
// Dates of another year than today keep a short year, for long-running 1C promotions.
export function formatShortDate(value: string, today?: string) { return `${value.slice(8, 10)}.${value.slice(5, 7)}${today && value.slice(0, 4) !== today.slice(0, 4) ? `.${value.slice(2, 4)}` : ""}`; }
export function formatStopperPrice(value: string | null) {
 if (value === null || value === "") return "—";
 const number = Number(value);
 return Number.isFinite(number) ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(number)} ₽` : value;
}
export function periodState(v: Pick<StopperPosition, "from" | "to">, today: string) {
 if (v.from > today) return "plan";
 if (v.to && v.to < today) return "done";
 return "run";
}
// Dark text on light stopper colors, white text on dark ones.
export function stopperTextColor(color: string) {
 const n = Number.parseInt(color.slice(1), 16);
 return ((n >> 16) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 > 165 ? "#13232A" : "#FFFFFF";
}
export function stopperNameError(name: string, stoppers: Stopper[], id: number | null) {
 const value = name.trim();
 if (!value) return "Укажите наименование.";
 if (stoppers.some(v => v.id !== id && v.name.toLocaleLowerCase("ru") === value.toLocaleLowerCase("ru"))) return "Такой стоппер уже есть.";
 return "";
}

export function stopperCounts(items: StopperPosition[], today: string) {
 const withoutStopper = items.filter(v => v.stopper_id === null);
 const manual = items.filter(v => v.manual).length;
 return { nostop: withoutStopper.length, fresh: withoutStopper.filter(v => v.received >= addDays(today, -1)).length, stop: items.length - withoutStopper.length, all: items.length, promo: items.length - manual, manual };
}
export function filterPositions(items: StopperPosition[], tab: StopperTab, query: string) {
 const normalized = query.trim().toLocaleLowerCase("ru");
 return items.filter(v => (tab !== "nostop" || v.stopper_id === null) && (tab !== "stop" || v.stopper_id !== null) && (tab !== "manual" || v.manual)
  && (!normalized || `${v.code} ${v.name}`.toLocaleLowerCase("ru").includes(normalized)));
}
// Positions without a stopper come first so they are not missed; thermal goods go before the shelf.
export function sortPositions(items: StopperPosition[], sort: StopperSort, stoppers: Stopper[]) {
 const stopperOrder = (v: StopperPosition) => v.stopper_id === null ? -1 : stoppers.findIndex(s => s.id === v.stopper_id);
 const modeOrder = (v: StopperPosition) => v.thermal_mode ? 0 : 1;
 const byStopper = (a: StopperPosition, b: StopperPosition) => stopperOrder(a) - stopperOrder(b);
 const byMode = (a: StopperPosition, b: StopperPosition) => modeOrder(a) - modeOrder(b);
 const byName = (a: StopperPosition, b: StopperPosition) => a.name.localeCompare(b.name, "ru") || a.from.localeCompare(b.from);
 return [...items].sort((a, b) => sort === "stopper" ? byStopper(a, b) || byMode(a, b) || byName(a, b) : byMode(a, b) || byStopper(a, b) || byName(a, b));
}
export function positionGroup(v: StopperPosition, sort: StopperSort) { return sort === "stopper" ? String(v.stopper_id ?? "") : String(v.thermal_mode); }
// The list shows promotions of the stores chosen in the price columns and products added by hand;
// a 1C document of other regions has no promotional price in these stores.
export function promotedInStores(v: Pick<StopperPosition, "manual" | "prices">) { return v.manual || v.prices.some(p => p.promo_price !== null); }
