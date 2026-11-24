// Why a product is in the task: a new regular price (the 1C revaluation), a stopper promotion that started
// or ended, a «Не соответствует» mark in a «Стопперы» task, or added by hand (in the task or the product card).
import type { PriceTagSource } from "../../../entities/price-tag/model";
export { formatMoment, sourceLabels, type PriceTagSource } from "../../../entities/price-tag/model";
// regular — one price; promo — discount with the regular price crossed out; card — loyalty card price
// with the regular price «без карты» above it.
export type PriceTagType = "regular" | "promo" | "card";
// The unit the price is printed for: шт for goods sold by the piece, 100 г or 1 кг for weighed goods.
export type PriceTagUnit = "pc" | "100g" | "kg";
export const unitLabels: Record<PriceTagUnit, string> = { pc: "шт", "100g": "100 г", kg: "1 кг" };
// The price for the unit: 1C keeps prices per piece or per kilogram.
export function unitPrice(value: number, unit: PriceTagUnit) { return unit === "100g" ? Math.round(value * 10) / 100 : value; }
// pending — the tag is to be printed: never printed, or a newer reason came after the last print (actual_at).
// printed_at is the last print in this task, last_printed_at the last print for the product in the store made
// before the position was put to print (actual_at). unit — the unit the price is printed for.
export type PriceTagItem = {
 id: number; product_id: string; source: PriceTagSource; doc_id: string | null; tag_type: PriceTagType; quantity: number;
 pending: boolean; actual_at: string; printed_at: string | null; last_printed_at: string | null; unit: PriceTagUnit;
 code: string; name: string; is_weight: boolean; barcode: string;
 price: string | null; price_from: string | null; promo_price: string | null; promo_from: string | null; promo_to: string | null;
};
export type PriceTagTask = { task_id: number; status: "new" | "in_progress" | "completed" | "cancelled"; start: string; store_id: string; store_code: string; store_name: string; store_address: string; items: PriceTagItem[] };
export type PriceTagProduct = { id: string; code: string; name: string; barcode: string; added: boolean };

export const maxQuantity = 99;
export const tagTypeLabels: Record<PriceTagType, string> = { regular: "Стандартный", promo: "Скидка", card: "По карте" };
// The loyalty card named on «цена С КАРТОЙ» tags.
export const cardName = "Икорный";
// A4 holds 3 × 6 tags of 60 × 47 mm placed edge to edge, so one cut separates two tags.
export const tagsPerSheet = 18;

export function hasPromo(item: Pick<PriceTagItem, "promo_price">) { return Number(item.promo_price ?? 0) > 0; }
// A tag needs a regular price; a promotional tag also needs a running promotion.
export function printable(item: Pick<PriceTagItem, "price" | "promo_price" | "tag_type">) { return Number(item.price ?? 0) > 0 && (item.tag_type === "regular" || hasPromo(item)); }

function day(value: string | null) {
 const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
 return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
}
// How long the price on the tag is valid: since the regular price date, or the promotion dates.
export function tagPeriod(item: Pick<PriceTagItem, "tag_type" | "price_from" | "promo_price" | "promo_from" | "promo_to">) {
 if (item.tag_type === "regular" || !hasPromo(item)) return item.price_from ? `с ${day(item.price_from)}` : "";
 const from = day(item.promo_from), to = day(item.promo_to);
 if (!to) return from ? `с ${from}` : "";
 return `с ${from && from.slice(-4) === to.slice(-4) ? from.slice(0, 5) : from} по ${to}`;
}

// What one printed tag shows: the main price and, for a discount or a card price, the regular price above it.
// A weighed product has no barcode on the tag (the scales label carries it): the tag shows the product code
// to find the product by instead.
export type TagView = { name: string; unit: "кг" | "100 г" | "шт"; barcode: string; code: string; price: number; old: number | null; state: PriceTagType };
export function tagView(item: PriceTagItem): TagView {
 const regular = Number(item.price ?? 0);
 const promo = item.tag_type !== "regular" && hasPromo(item);
 const unit = item.unit ?? (item.is_weight ? "kg" : "pc");
 return { name: item.name, unit: unit === "pc" ? "шт" : unit === "100g" ? "100 г" : "кг", barcode: item.is_weight ? "" : item.barcode, code: item.is_weight ? item.code : "", price: unitPrice(promo ? Number(item.promo_price) : regular, unit), old: promo ? unitPrice(regular, unit) : null, state: promo ? item.tag_type : "regular" };
}
// Rubles with thousands split by a no-break space and kopecks apart: 11550 → ["11 550", "00"].
export function priceParts(value: number): [string, string] {
 const [integer, kopecks] = value.toFixed(2).split(".");
 return [integer.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0"), kopecks];
}

export function matchesQuery(item: Pick<PriceTagItem, "name" | "code" | "barcode">, query: string) {
 const q = query.trim().toLowerCase();
 return !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.barcode.includes(q);
}

export function summary(items: PriceTagItem[], selected: ReadonlySet<number>) {
 const chosen = items.filter(v => selected.has(v.id));
 return {
  selected: chosen.length, total: items.length,
  tags: chosen.reduce((sum, v) => sum + v.quantity, 0),
  printed: items.filter(v => !v.pending).length,
 };
}

// Positions shown by print status.
export type PrintFilter = "all" | "pending" | "printed";
export function byPrintStatus(items: PriceTagItem[], filter: PrintFilter) { return filter === "all" ? items : items.filter(v => v.pending === (filter === "pending")); }

// Every position gives as many tags as its quantity; tags go 18 to an A4 sheet.
export function expandTags(items: PriceTagItem[]) { return items.filter(printable).flatMap(item => Array.from({ length: item.quantity }, (_, copy) => ({ item, key: `${item.id}-${copy}` }))); }
export function sheets<T>(tags: T[], size = tagsPerSheet): T[][] {
 const out: T[][] = [];
 for (let i = 0; i < tags.length; i += size) out.push(tags.slice(i, i + size));
 return out;
}
