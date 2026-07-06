"use client";

import { useEffect, useState } from "react";
import type { OrderControlledItem } from "@/entities/order";
import {
  BARCODE_SCANNER_CAPTURE_EVENT,
  formatNumber
} from "./order-control-shared";

type OrderProcessingResultsPanelProps = {
  lines: OrderControlledItem[];
};

export function OrderProcessingResultsPanel({
  lines
}: OrderProcessingResultsPanelProps) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredLines =
    normalizedSearch.length === 0
      ? lines
      : lines.filter((line) =>
          line.productName.toLowerCase().includes(normalizedSearch)
        );

  useEffect(() => {
    function clearSearchAfterScannerCapture() {
      setSearch("");
    }

    window.addEventListener(
      BARCODE_SCANNER_CAPTURE_EVENT,
      clearSearchAfterScannerCapture
    );

    return () => {
      window.removeEventListener(
        BARCODE_SCANNER_CAPTURE_EVENT,
        clearSearchAfterScannerCapture
      );
    };
  }, []);

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-base font-bold text-slate-950">
          Результаты обработки
        </h3>
        <div className="mt-1 text-sm text-slate-500">
          маркируемой продукции
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <input
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none ring-2 ring-slate-100 transition focus:border-violet-500 focus:ring-violet-100"
          placeholder="Поиск (Ctrl+F)"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[620px] w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[18%]" />
            <col className="w-[32%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                Номенклатура
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">
                Количество
              </th>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                Марка
              </th>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold leading-tight">
                Результат
                <br />
                проверки
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.map((line) => (
              <tr className="odd:bg-white even:bg-slate-50/60" key={line.mark}>
                <td className="max-w-56 truncate border-b border-slate-100 px-3 py-2 font-medium text-slate-900">
                  {line.productName}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatNumber(line.quantity)}
                </td>
                <td className="break-all border-b border-slate-100 px-3 py-2 text-slate-600">
                  {line.mark}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {line.result ? (
                    <span
                      aria-label="Проверено"
                      className="text-sm font-bold text-emerald-700"
                      title="Проверено"
                    >
                      ✓
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
            {filteredLines.length === 0 ? (
              <tr>
                <td
                  className="border-b border-slate-100 px-3 py-6 text-center text-sm text-slate-500"
                  colSpan={4}
                >
                  Ничего не найдено
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
