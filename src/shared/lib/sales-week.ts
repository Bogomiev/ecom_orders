/** Seven calendar days ending yesterday, in the store's Moscow time zone. */
export function formatSalesWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const end = new Date(Date.UTC(part("year"), part("month") - 1, part("day") - 1));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);
  const day = (date: Date) => String(date.getUTCDate()).padStart(2, "0");
  const month = (date: Date) => String(date.getUTCMonth() + 1).padStart(2, "0");
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  return `За неделю, ${day(start)}${sameMonth ? "" : `.${month(start)}`}–${day(end)}.${month(end)}`;
}
