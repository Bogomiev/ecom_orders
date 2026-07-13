"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Order, OrderItem } from "@/entities/order";
import type { BarcodeInfo, Product } from "@/entities/product";
import {
  BARCODE_SCANNER_CAPTURE_EVENT,
  formatMoney,
  formatNumber,
  type ScanNotification
} from "./order-control-shared";

const SCANNER_MAX_KEY_INTERVAL_MS = 80;
const SCANNER_MIN_BARCODE_LENGTH = 6;
const WEIGHT_QUANTITY_OVERAGE_PERCENT = 15;

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

type BarcodeIndexEntry = {
  barcodeInfo: BarcodeInfo;
  product: Product;
};

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
  const productsByBarcode = useMemo(() => {
    const index = new Map<string, BarcodeIndexEntry>();

    products.forEach((product) => {
      product.barcodes.forEach((barcodeInfo) => {
        index.set(barcodeInfo.barcode, {
          barcodeInfo,
          product
        });
      });
    });

    return index;
  }, [products]);
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

    const barcodeMatch = productsByBarcode.get(barcode);

    if (barcodeMatch === undefined) {
      onNotify(`Штрихкод ${barcode} не найден в справочнике товаров`, "error");
      return;
    }

    const { barcodeInfo, product } = barcodeMatch;
    const orderItem = order.items.find((item) => item.product_id === product.uid);

    if (orderItem === undefined) {
      onNotify(
        <>
          Товар{" "}
          <strong className="font-black text-blue-950">{product.name}</strong>{" "}
          отсутствует в заказе
        </>,
        "error"
      );
      return;
    }

    const shouldAddControlledItem = orderItem.marking_product;
    const isAlreadyControlled =
      shouldAddControlledItem &&
      order.controlledItems.some(
        (controlledItem) => controlledItem.mark === barcode
      );

    if (isAlreadyControlled) {
      onNotify(
        <>
          Просканированный штриход товара{" "}
          <strong className="font-black text-blue-950">{product.name}</strong>{" "}
          уже добавлен в заказ
        </>,
        "warning"
      );
      return;
    }

    const quantityToAdd = barcodeInfo?.ratio ?? 1;
    const nextQuantityFact = orderItem.quantity_fact + quantityToAdd;
    const allowedWeightQuantity =
      orderItem.quantity * (1 + WEIGHT_QUANTITY_OVERAGE_PERCENT / 100);
    const isQuantityExceeded = orderItem.is_weight
      ? nextQuantityFact > allowedWeightQuantity
      : nextQuantityFact > orderItem.quantity;

    if (isQuantityExceeded) {
      onNotify(
        <>
          Количество товара{" "}
          <strong className="font-black text-blue-950">{product.name}</strong>{" "}
          превышает количество в заказе
        </>,
        "warning"
      );
      return;
    }

    const nextOrder: Order = {
      ...order,
      items: order.items.map((item) =>
        item.product_id === product.uid
          ? {
              ...item,
              quantity_fact: nextQuantityFact
            }
          : item
      ),
      controlledItems: shouldAddControlledItem
        ? [
            ...order.controlledItems,
            {
              product_id: product.uid,
              product_name: product.name,
              quantity: quantityToAdd,
              mark: barcode,
              result: true
            }
          ]
        : order.controlledItems
    };

    onOrderChange(nextOrder);
  }

  function submitBarcodeSearch(value: string) {
    handleScannedBarcode(value);
    setBarcodeSearch("");
    window.dispatchEvent(new Event(BARCODE_SCANNER_CAPTURE_EVENT));
    barcodeSearchInputRef.current?.focus();
    barcodeSearchInputRef.current?.select();
  }

  useEffect(() => {
    submitBarcodeSearchRef.current = submitBarcodeSearch;
  });

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-slate-950">
            Заказ № {order.number}
          </h3>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {order.status}
          </span>
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {order.source} • {order.shipment_store_name} • {order.delivery_time}
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <input
          ref={barcodeSearchInputRef}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none ring-2 ring-slate-100 transition focus:border-violet-500 focus:ring-violet-100"
          placeholder="Найти товар по штрихкоду"
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
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                Номенклатура
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">
                Количество
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">
                Цена
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">
                Сумма
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">
                Количество факт
              </th>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                Маркируемый товар
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr
                className={index === 0 ? "bg-violet-50" : "odd:bg-white even:bg-slate-50/60"}
                key={line.product_id}
              >
                <td className="max-w-64 truncate border-b border-slate-100 px-3 py-2 font-medium text-slate-900">
                  {line.product_name}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatNumber(line.quantity)}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatNumber(line.price)}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatMoney(line.amount)}
                </td>
                <td
                  className={`border-b border-slate-100 px-3 py-2 text-right font-bold tabular-nums ${
                    line.is_weight && line.quantity_fact > line.quantity
                      ? "text-red-600"
                      : "text-slate-700"
                  }`}
                >
                  {formatNumber(line.quantity_fact)}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-slate-600">
                  {line.marking_product ? <span>✓</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div className="text-sm text-slate-500">Итого по заказу</div>
        <div className="text-lg font-bold tabular-nums text-slate-950">
          {formatMoney(total)} ₽
        </div>
      </div>
    </section>
  );
}
