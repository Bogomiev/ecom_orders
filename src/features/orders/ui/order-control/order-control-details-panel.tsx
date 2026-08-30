"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Order, OrderItem } from "@/entities/order";
import type { Product } from "@/entities/product";
import {
  applyBarcodeToOrder,
  createBarcodeIndex,
  type ScanOrderErrorCode
} from "../../model/scan-order";
import {
  BARCODE_SCANNER_CAPTURE_EVENT,
  formatMoney,
  formatNumber,
  isOrderLineComplete,
  type ScanNotification
} from "./order-control-shared";

const SCANNER_MAX_KEY_INTERVAL_MS = 80;
const SCANNER_MIN_BARCODE_LENGTH = 6;

function isPrintableScannerKey(event: KeyboardEvent) {
  return (
    event.key.length === 1 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  );
}

function isEditableElement(element: Element | null) {
  if (element === null) {
    return false;
  }

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.closest("[contenteditable='true']") !== null
  );
}

type OrderControlDetailsPanelProps = {
  lines: OrderItem[];
  onOrderChange: (order: Order) => void;
  onNotify: (message: ReactNode, tone: ScanNotification["tone"]) => void;
  order: Order;
  products: Product[];
};

export function HonestSignIcon() {
  return (
    <svg
      aria-label="Маркируемый товар — Честный ЗНАК"
      className="h-5 w-5 shrink-0"
      role="img"
      viewBox="0 0 48 48"
    >
      <rect fill="#ffec00" height="48" rx="8" width="48" />
      <g
        fill="none"
        stroke="#5f6065"
        strokeLinecap="square"
        strokeLinejoin="round"
        strokeWidth="5"
      >
        <path d="M11 20v-4a5 5 0 0 1 5-5h4" />
        <path d="M28 11h4a5 5 0 0 1 5 5v4" />
        <path d="M37 28v4a5 5 0 0 1-5 5h-4" />
        <path d="M20 37h-4a5 5 0 0 1-5-5v-4" />
      </g>
      <path
        d="m15.5 25 7 7 11-13"
        fill="none"
        stroke="#5f6065"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="5.5"
      />
    </svg>
  );
}

export function OrderControlDetailsPanel({
  lines,
  onOrderChange,
  onNotify,
  order,
  products
}: OrderControlDetailsPanelProps) {
  const barcodeSearchInputRef = useRef<HTMLInputElement>(null);
  const scannerBufferRef = useRef({
    lastAt: 0,
    startedAt: 0,
    value: ""
  });
  const submitBarcodeSearchRef = useRef<(value: string) => void>(() => undefined);
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [productIdPendingClear, setProductIdPendingClear] = useState<string | null>(
    null
  );
  const productsByBarcode = useMemo(
    () => createBarcodeIndex(products),
    [products]
  );
  const productCodesById = useMemo(
    () => new Map(products.map((product) => [product.uid, product.code])),
    [products]
  );
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  useEffect(() => {
    const input = barcodeSearchInputRef.current;

    if (input === null) {
      return;
    }

    input.focus();
    input.select();
  }, [order.id]);

  useEffect(() => {
    function focusBarcodeSearchInput(event: KeyboardEvent) {
      const input = barcodeSearchInputRef.current;

      if (
        input === null ||
        document.activeElement === input ||
        isEditableElement(document.activeElement)
      ) {
        return;
      }

      if (isPrintableScannerKey(event)) {
        event.preventDefault();
        input.focus();
        setBarcodeSearch(event.key);
        return;
      }

      if (event.key === "Enter") {
        input.focus();
      }
    }

    window.addEventListener("keydown", focusBarcodeSearchInput, {
      capture: true
    });

    return () => {
      window.removeEventListener("keydown", focusBarcodeSearchInput, {
        capture: true
      });
    };
  }, []);

  useEffect(() => {
    function resetScannerBuffer() {
      scannerBufferRef.current = {
        lastAt: 0,
        startedAt: 0,
        value: ""
      };
    }

    function captureScannerInput(event: KeyboardEvent) {
      const now = event.timeStamp;
      const buffer = scannerBufferRef.current;

      if (isPrintableScannerKey(event)) {
        const shouldStartNewBuffer =
          buffer.value.length === 0 ||
          now - buffer.lastAt > SCANNER_MAX_KEY_INTERVAL_MS;

        scannerBufferRef.current = {
          lastAt: now,
          startedAt: shouldStartNewBuffer ? now : buffer.startedAt,
          value: shouldStartNewBuffer
            ? event.key
            : `${buffer.value}${event.key}`
        };
        return;
      }

      if (event.key !== "Enter") {
        return;
      }

      const bufferedBarcode = buffer.value;
      const barcodeSearchInput = barcodeSearchInputRef.current;
      const inputBarcode =
        barcodeSearchInput !== null && document.activeElement === barcodeSearchInput
          ? barcodeSearchInput.value.trim()
          : "";
      const barcode =
        inputBarcode.length > bufferedBarcode.length
          ? inputBarcode
          : bufferedBarcode;
      const elapsedMs = buffer.lastAt - buffer.startedAt;
      const maxElapsedMs = Math.max(
        250,
        barcode.length * SCANNER_MAX_KEY_INTERVAL_MS
      );
      const isScannerInput =
        barcode.length >= SCANNER_MIN_BARCODE_LENGTH && elapsedMs <= maxElapsedMs;

      resetScannerBuffer();

      if (!isScannerInput) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      submitBarcodeSearchRef.current(barcode);
    }

    window.addEventListener("keydown", captureScannerInput, {
      capture: true
    });

    return () => {
      window.removeEventListener("keydown", captureScannerInput, {
        capture: true
      });
    };
  }, []);

  function handleScannedBarcode(scannedBarcode: string) {
    const barcode = scannedBarcode.trim();

    if (barcode.length === 0) {
      return;
    }

    const result = applyBarcodeToOrder(order, productsByBarcode, barcode);

    if (result.status === "success") {
      onOrderChange(result.order);
      return;
    }

    notifyAboutScanError(result.code, barcode, result.product?.name);
  }

  function notifyAboutScanError(
    code: ScanOrderErrorCode,
    barcode: string,
    productName?: string
  ) {
    if (code === "barcode-not-found") {
      onNotify(`По штрихкоду ${barcode} товар не найден`, "error");
    } else if (code === "product-not-in-order") {
      onNotify(
        <>
          Товар <strong className="font-black text-blue-950">{productName}</strong>{" "}
          в заказе не найден
        </>,
        "error"
      );
    } else if (code === "mark-required") {
      onNotify("Просканируйте марку товара", "warning");
    } else if (code === "mark-already-scanned") {
      onNotify(
        <>
          Просканированный штрихкод товара{" "}
          <strong className="font-black text-blue-950">{productName}</strong>{" "}
          уже добавлен в заказ
        </>,
        "warning"
      );
    } else {
      onNotify(
        <>
          Количество товара{" "}
          <strong className="font-black text-blue-950">{productName}</strong>{" "}
          превышает количество в заказе
        </>,
        "warning"
      );
    }
  }

  function submitBarcodeSearch(value: string) {
    handleScannedBarcode(value);
    setBarcodeSearch("");
    window.dispatchEvent(new Event(BARCODE_SCANNER_CAPTURE_EVENT));
    barcodeSearchInputRef.current?.focus();
    barcodeSearchInputRef.current?.select();
  }

  function changeQuantityFact(productId: string, change: number) {
    onOrderChange({
      ...order,
      items: order.items.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity_fact: Math.min(
                item.quantity,
                Math.max(
                  0,
                  Math.round((item.quantity_fact + change) * 1000) / 1000
                )
              )
            }
          : item
      )
    });
  }

  function clearMarkedLine() {
    if (productIdPendingClear === null) return;

    onOrderChange({
      ...order,
      items: order.items.map((item) =>
        item.product_id === productIdPendingClear
          ? { ...item, quantity_fact: 0 }
          : item
      ),
      controlledItems: order.controlledItems.filter(
        (item) => item.product_id !== productIdPendingClear
      )
    });
    setProductIdPendingClear(null);
  }

  useEffect(() => {
    submitBarcodeSearchRef.current = submitBarcodeSearch;
  });

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2.5 border-b app-border px-5 py-3">
        <input
          ref={barcodeSearchInputRef}
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 app-surface px-3.5 text-sm font-medium app-text outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Отсканируйте или введите штрихкод…"
          type="search"
          value={barcodeSearch}
          onChange={(event) => setBarcodeSearch(event.target.value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submitBarcodeSearch(event.currentTarget.value);
            }
          }}
        />
        <button
          className="h-10 min-w-32 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          type="button"
          onClick={() => submitBarcodeSearch(barcodeSearch)}
        >
          Найти
        </button>
      </div>

      <div className="flex items-center justify-between border-b app-border px-5 py-2.5 text-xs">
        <span className="app-muted">Итого по заказу</span>
        <strong className="font-bold tabular-nums app-text">
          {formatMoney(total)} ₽
        </strong>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup><col /><col className="w-20" /><col className="w-40" /></colgroup>
          <thead className="sticky top-0 z-[1] app-surface">
            <tr>
              <th className="border-b app-border px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide app-muted">Товар</th>
              <th className="border-b app-border px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">План</th>
              <th className="border-b app-border px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide app-muted">Факт</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const isComplete = isOrderLineComplete(line);
              const isUntouched = line.quantity_fact === 0;
              const factTone = isComplete
                ? "bg-[#e3f3e9] text-[#00963e]"
                : isUntouched
                  ? "app-surface-muted app-muted"
                  : "bg-red-100 text-red-600";

              return (
                <tr key={line.product_id}>
                  <td className="border-b app-border px-5 py-2.5">
                    <div className="flex items-start gap-2.5">
                      {line.marking_product ? <HonestSignIcon /> : null}
                      <div className="min-w-0">
                        <div className="break-words text-[13px] font-bold leading-[18px] app-text">
                          {line.product_name}
                        </div>
                        <div className="mt-0.5 text-[11px] leading-4 app-muted">
                          Код {productCodesById.get(line.product_id) ?? line.product_id} · Цена {formatMoney(line.price)} ₽ · Сумма {formatMoney(line.amount)} ₽
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b app-border px-3 py-2.5 text-right text-sm font-bold tabular-nums app-text">
                    {formatNumber(line.quantity)}
                  </td>
                  <td className="border-b app-border px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        aria-label={
                          line.marking_product
                            ? `Очистить строку ${line.product_name}`
                            : `Уменьшить количество ${line.product_name}`
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-base font-bold text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={line.quantity_fact === 0}
                        type="button"
                        onClick={() => {
                          if (line.marking_product) {
                            setProductIdPendingClear(line.product_id);
                          } else {
                            changeQuantityFact(line.product_id, -1);
                          }
                        }}
                      >
                        {line.marking_product ? "×" : "−"}
                      </button>
                      <span className={`inline-flex min-w-10 justify-center rounded-md px-2.5 py-1.5 text-sm font-bold tabular-nums ${factTone}`}>
                        {formatNumber(line.quantity_fact)}
                      </span>
                      <button
                        aria-label={`Увеличить количество ${line.product_name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-base font-bold text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={
                          line.marking_product ||
                          line.is_weight ||
                          line.quantity_fact >= line.quantity
                        }
                        type="button"
                        onClick={() => changeQuantityFact(line.product_id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {productIdPendingClear !== null ? (
        <div
          aria-modal="true"
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <div className="w-full max-w-xs rounded-xl app-surface p-4 shadow-2xl">
            <h3 className="text-sm font-bold app-text">Очистить строку?</h3>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border app-border px-4 py-2 text-xs font-bold app-text"
                type="button"
                onClick={() => setProductIdPendingClear(null)}
              >
                Нет
              </button>
              <button
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                type="button"
                onClick={clearMarkedLine}
              >
                Да
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
