import type { Order } from "../model/types";
import { parseMoscowDateTime } from "../../../shared/lib/date-time";

export type OrderTone = "blue" | "green" | "red" | "yellow";

function getExtendedStatus(order: Order) {
  return order.extended_status.trim().toLocaleLowerCase("ru-RU");
}

export function isOrderAwaitingConfirmation(order: Order) {
  return getExtendedStatus(order) === "ожидает подтверждения";
}

export function isOrderReady(order: Order) {
  return getExtendedStatus(order) === "готов";
}

export function isOrderUnavailableForOpening(order: Order) {
  const status = getExtendedStatus(order);
  return status === "отменен" || status === "передан курьеру";
}

export function getOrderTone(order: Order): OrderTone {
  const status = `${order.status} ${order.extended_status}`.toLowerCase();
  if (status.includes("нет товар") || status.includes("отмен") || status.includes("ошиб")) return "red";
  if (isOrderAwaitingConfirmation(order)) return "blue";
  if (status.includes("сбор") || status.includes("ожида")) {
    return "yellow";
  }
  if (status.includes("готов") || status.includes("выполн") || status.includes("заверш")) return "green";
  return "blue";
}

export function getOrderStatusLabel(order: Order) {
  const status = getExtendedStatus(order);
  if (status === "готов") return "Готов";
  if (status === "отменен") return "Отменен";
  if (status === "передан курьеру") return "Передан курьеру";

  const tone = getOrderTone(order);
  return {
    blue: "Новый",
    green: "Готов",
    red: "Нет товара",
    yellow: "В сборке"
  }[tone];
}

export function getMarketplaceLabel(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("яндекс")) return "ЯМ";
  if (normalized.includes("wildberries")) return "WB";
  if (normalized.includes("ozon")) return "OZON";
  if (normalized.includes("сайт")) return "САЙТ";
  return source.toUpperCase();
}

export function formatOrderTime(value: string) {
  const date = parseMoscowDateTime(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatOrderMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(value);
}
