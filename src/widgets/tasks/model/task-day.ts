// The store calendar day: tasks start in store time, as the RMS scheduler does.
export function storeToday(now = new Date(), timeZone = "Asia/Vladivostok") {
 return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
// An open task left from an earlier day is marked with its start day, e.g. «с 18.11».
export function earlierStart(start: string | undefined, today: string) {
 const day = (start ?? "").slice(0, 10);
 if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day >= today) return "";
 return `с ${day.slice(8, 10)}.${day.slice(5, 7)}${day.slice(0, 4) === today.slice(0, 4) ? "" : `.${day.slice(0, 4)}`}`;
}
