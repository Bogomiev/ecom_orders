// Why a product is in the «Печать ценников» task: a new regular price (the 1C revaluation), a stopper
// promotion that started or ended, a «Не соответствует» mark in a «Стопперы» task, or added by hand.
export type PriceTagSource = "revaluation" | "promo_start" | "promo_end" | "stopper_bad" | "manual";

export const sourceLabels: Record<PriceTagSource, string> = {
 revaluation: "Переоценка", promo_start: "Начало акции", promo_end: "Конец акции", stopper_bad: "Не соответствует", manual: "Добавлен вручную"
};

// A stopper on the shelf: its name and color.
export type PriceTagStopper = { name: string; color: string };

// The price tag of a product in a store for the product card: the standing «Печать ценников» task (null
// before the store has one), the position of the product in it (null when it is not there; pending while
// the tag is to be printed), the last time the store printed a tag for the product and its stopper today.
export type PriceTagProductState = {
 task_id: number | null; item_id: number | null; pending: boolean; source: PriceTagSource | null; quantity: number;
 actual_at: string | null; last_printed_at: string | null; stopper: PriceTagStopper | null;
};

// «2026-11-10T12:05:00» → «10.11.2026 12:05».
export function formatMoment(value: string | null) {
 const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? "");
 return match ? `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}` : "";
}

// What the product card offers: to show the task while the tag waits in it, otherwise to put the product
// into the task, with the last print of its tag.
export function priceTagProductStatus(state: PriceTagProductState) {
 const queued = state.task_id !== null && state.item_id !== null && state.pending;
 return {
  queued,
  action: queued ? "Показать задание на печать ценника" : "Сформировать задание на печать ценника",
  printed: queued ? "" : state.last_printed_at ? `Последняя печать ${formatMoment(state.last_printed_at)}` : "Ценник ещё не печатался",
 };
}

// Text on a stopper color: dark on light colors (e.g. yellow «Выгодно»), white on dark ones.
export function stopperTextColor(hex: string) {
 const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
 if (!match) return "#ffffff";
 const [r, g, b] = match.slice(1).map(v => parseInt(v, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
 return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#141414" : "#ffffff";
}
