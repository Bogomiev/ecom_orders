import { z } from "zod";
import type { Product } from "@/entities/product";
import { findScannedProduct, parseScannedCode, type BarcodeIndexEntry } from "../../../features/orders/model/scan-order";
import { formatScannedMark } from "../../../shared/lib/format-scanned-mark";
import { normalizeScannerLayout } from "../../../shared/lib/normalize-scanner-layout";

const status = z.enum(["NEW", "SENT", "PROCESSED", "CANCELLED", "COMPLETED"]);
const header = z.object({
  id: z.uuid(),
  number: z.string().nullable(),
  date: z.string(),
  status,
  item_count: z.number().int().nonnegative()
});
const item = z.object({
  product_id: z.uuid(),
  amount: z.number().positive(),
  marks: z.array(z.string()).optional()
});

export const returnRequestSchema = header.extend({ items: z.array(item) });
export const returnStatusResponseSchema = header.pick({ status: true });
export const returnListSchema = z.object({
  items: z.array(header),
  totalItems: z.number().int().nonnegative()
});

export type ReturnStatus = z.infer<typeof status>;
export type ReturnRequest = z.infer<typeof returnRequestSchema>;
export type ReturnList = z.infer<typeof returnListSchema>;
export type ReturnItem = z.infer<typeof item>;

export const returnStatusLabel: Record<ReturnStatus, string> = {
  NEW: "Создана",
  SENT: "Отправлено в 1С",
  PROCESSED: "Обработана в 1С",
  CANCELLED: "Отменена",
  COMPLETED: "Завершена"
};

export function canModifyReturn(value: ReturnStatus) {
  return value === "NEW" || value === "SENT" || value === "PROCESSED";
}

export function isMarked(product: Product | undefined) {
  return Boolean(product?.markingType && product.markingType !== "БезОсобенностейУчета");
}

export function addReturnScan(items: ReturnItem[], index: Map<string, BarcodeIndexEntry>, raw: string): ReturnItem[] {
  const barcode = normalizeScannerLayout(raw.replace(/^[\r\n\t ]+|[\r\n\t ]+$/g, ""));
  const parsed = parseScannedCode(barcode);
  const match = findScannedProduct(index, barcode, parsed);
  if (!match) throw new Error("Товар по коду не найден");

  const marked = isMarked(match.product);
  const mark = marked && parsed.isMark ? formatScannedMark(barcode) : "";
  if (marked && !/^\(01\)\d{14}\(21\).+/.test(mark)) {
    throw new Error(`Отсканируйте марку товара «${match.product.name}»`);
  }
  if (mark) {
    const identity = formatScannedMark(mark, { removeCryptoTail: true });
    if (items.some((line) => line.marks?.some((code) => formatScannedMark(code, { removeCryptoTail: true }) === identity))) {
      throw new Error("Эта марка уже отсканирована");
    }
  }

  const product_id = match.product.uid;
  const current = items.find((line) => line.product_id === product_id);
  const added = marked ? 1 : match.quantity;
  if (!Number.isFinite(added) || added <= 0) throw new Error("Некорректное количество в штрихкоде");
  const amount = Math.round(((current?.amount ?? 0) + added) * 1000) / 1000;
  if (amount <= 0) throw new Error("Некорректное количество в штрихкоде");
  const next = { product_id, amount, marks: mark ? [...(current?.marks ?? []), mark] : current?.marks };
  return current ? items.map((line) => line === current ? next : line) : [...items, next];
}
