"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/entities/product";
import { BARCODE_SCANNER_CAPTURE_EVENT, formatNumber } from "@/features/orders/ui/order-control/order-control-shared";
import { Dialog } from "@/shared/ui/dialog";
import {
  addBarcodeToProductCounting,
  loadProductCounting,
  saveProductCounting,
  type ProductCountingLine
} from "../model/product-counting";

const SCANNER_MAX_KEY_INTERVAL_MS = 80;
const SCANNER_MIN_BARCODE_LENGTH = 6;

type ProductCountingDialogProps = {
  isOpen: boolean;
  isLoading: boolean;
  loadError: string | null;
  onClose: () => void;
  products: Product[];
};

function isPrintableScannerKey(event: KeyboardEvent) {
  return event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey;
}

export function ProductCountingDialog({
  isOpen,
  isLoading,
  loadError,
  onClose,
  products
}: ProductCountingDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<(barcode: string) => void>(() => undefined);
  const scannerBufferRef = useRef({ lastAt: 0, startedAt: 0, value: "" });
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [lines, setLines] = useState<ProductCountingLine[]>(loadProductCounting);
  const [notification, setNotification] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);

  useEffect(() => {
    if (notification === null) return;
    const timeoutId = window.setTimeout(() => setNotification(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  function submitBarcode(value: string) {
    const barcode = value.trim();
    if (barcode.length === 0 || isLoading) return;

    const result = addBarcodeToProductCounting(lines, products, barcode);
    if (result === null) {
      setNotification(`По штрихкоду ${barcode} товар не найден`);
    } else {
      setLines(result.lines);
      saveProductCounting(result.lines);
      setNotification(null);
    }

    setBarcodeSearch("");
    window.dispatchEvent(new Event(BARCODE_SCANNER_CAPTURE_EVENT));
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  useEffect(() => {
    submitRef.current = submitBarcode;
  });

  useEffect(() => {
    if (!isOpen) return;

    function captureScannerInput(event: KeyboardEvent) {
      const buffer = scannerBufferRef.current;
      const now = event.timeStamp;

      if (isPrintableScannerKey(event)) {
        const startNew = buffer.value.length === 0 || now - buffer.lastAt > SCANNER_MAX_KEY_INTERVAL_MS;
        scannerBufferRef.current = {
          lastAt: now,
          startedAt: startNew ? now : buffer.startedAt,
          value: startNew ? event.key : `${buffer.value}${event.key}`
        };
        return;
      }

      if (event.key !== "Enter") return;
      const inputBarcode = document.activeElement === inputRef.current ? inputRef.current?.value.trim() ?? "" : "";
      const barcode = inputBarcode.length > buffer.value.length ? inputBarcode : buffer.value;
      const elapsed = buffer.lastAt - buffer.startedAt;
      scannerBufferRef.current = { lastAt: 0, startedAt: 0, value: "" };

      if (barcode.length < SCANNER_MIN_BARCODE_LENGTH || elapsed > Math.max(250, barcode.length * SCANNER_MAX_KEY_INTERVAL_MS)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      submitRef.current(barcode);
    }

    window.addEventListener("keydown", captureScannerInput, { capture: true });
    return () => window.removeEventListener("keydown", captureScannerInput, { capture: true });
  }, [isOpen]);

  const pendingDeleteLine = useMemo(
    () => lines.find((line) => line.productId === pendingDeleteId),
    [lines, pendingDeleteId]
  );

  function deleteLine() {
    if (pendingDeleteId === null) return;
    const nextLines = lines.filter((line) => line.productId !== pendingDeleteId);
    setLines(nextLines);
    saveProductCounting(nextLines);
    setPendingDeleteId(null);
  }

  function clearLines() {
    setLines([]);
    saveProductCounting([]);
    setIsClearConfirmationOpen(false);
  }

  if (!isOpen) return null;

  return (
    <Dialog ariaLabelledBy="product-counting-title" className="relative mx-auto flex h-[min(650px,calc(100vh-32px))] w-[min(760px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl app-surface shadow-2xl [zoom:.83]" onClose={onClose}>
      <div className="flex items-center justify-between border-b app-border px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 text-teal-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M4 7h16M6 3v4m12-4v4M6 11h2m3 0h2m3 0h2M6 15h2m3 0h2m3 0h2M6 19h2m3 0h2" />
              <rect height="18" rx="2" width="18" x="3" y="3" />
            </svg>
          </span>
          <h2 id="product-counting-title" className="text-lg font-bold app-text">Подсчет товара</h2>
        </div>
        <button aria-label="Закрыть" className="flex h-9 w-9 items-center justify-center rounded-lg border app-border app-surface-muted text-lg font-medium app-muted transition hover:bg-slate-200 hover:text-slate-900" type="button" onClick={onClose}>×</button>
      </div>

      <div className="flex gap-2.5 border-b app-border px-5 py-3">
        <input ref={inputRef} autoFocus className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 app-surface px-3.5 text-sm font-medium app-text outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" disabled={isLoading} placeholder="Отсканируйте или введите штрихкод…" type="search" value={barcodeSearch} onChange={(event) => setBarcodeSearch(event.target.value)} onFocus={(event) => event.target.select()} onKeyDown={(event) => { if (event.key === "Enter") submitBarcode(event.currentTarget.value); }} />
        <button className="h-10 min-w-32 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="button" onClick={() => submitBarcode(barcodeSearch)}>Найти</button>
      </div>

      {loadError !== null ? <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">{loadError}</div> : null}
      {notification !== null ? <div className="absolute right-6 top-6 z-10 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-lg" role="status">{notification}</div> : null}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup><col /><col className="w-32" /><col className="w-44" /><col className="w-16" /></colgroup>
          <thead className="sticky top-0 z-[1] app-surface">
            <tr>
              <th className="border-b app-border px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide app-muted">Товар</th>
              <th className="border-b app-border px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Количество</th>
              <th className="border-b app-border px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Количество упаковок</th>
              <th className="border-b app-border px-3 py-2.5"><span className="sr-only">Действия</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td className="px-5 py-12 text-center text-sm app-muted" colSpan={4}>{isLoading ? "Загрузка товаров…" : "Отсканируйте товар, чтобы добавить его в таблицу"}</td></tr>
            ) : lines.map((line) => (
              <tr key={line.productId}>
                <td className="border-b app-border px-5 py-3"><div className="break-words text-[13px] font-bold leading-[18px] app-text">{line.productName}</div><div className="mt-0.5 text-[11px] app-muted">Код {line.productCode}</div></td>
                <td className="border-b app-border px-3 py-3 text-right text-sm font-bold tabular-nums app-text">{formatNumber(line.quantity)}</td>
                <td className="border-b app-border px-3 py-3 text-right text-sm font-bold tabular-nums app-text">{line.packageQuantity}</td>
                <td className="border-b app-border px-3 py-3 text-right"><button aria-label={`Удалить ${line.productName}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-lg font-bold text-red-600 transition hover:bg-red-100" title="Удалить строку" type="button" onClick={() => setPendingDeleteId(line.productId)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t app-border app-surface-muted px-5 py-3">
        <button className="rounded-lg border border-red-300 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={lines.length === 0} type="button" onClick={() => setIsClearConfirmationOpen(true)}>Очистить</button>
      </div>

      {pendingDeleteLine !== undefined || isClearConfirmationOpen ? (
        <div aria-modal="true" className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 p-4" role="dialog">
          <div className="w-full max-w-sm rounded-xl app-surface p-5 shadow-2xl">
            <h3 className="text-base font-bold app-text">{pendingDeleteLine !== undefined ? `Удалить «${pendingDeleteLine.productName}»?` : "Очистить всю таблицу?"}</h3>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg border app-border px-4 py-2 text-sm font-bold app-text" type="button" onClick={() => { setPendingDeleteId(null); setIsClearConfirmationOpen(false); }}>Нет</button>
              <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white" type="button" onClick={pendingDeleteLine !== undefined ? deleteLine : clearLines}>Да</button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
