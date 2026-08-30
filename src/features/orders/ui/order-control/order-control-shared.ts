import type { ReactNode } from "react";
import type { OrderItem } from "@/entities/order";

export type ScanNotification = {
  id: number;
  message: ReactNode;
  tone: "warning" | "error";
};

export const BARCODE_SCANNER_CAPTURE_EVENT =
  "order-control:barcode-scanner-capture";

export function isOrderLineComplete(line: OrderItem) {
  return line.quantity_fact >= line.quantity;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3
  }).format(value);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}
