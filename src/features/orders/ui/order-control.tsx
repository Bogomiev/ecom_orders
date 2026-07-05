"use client";

import { useEffect } from "react";
import type { Order, OrderItem } from "@/entities/order";

type OrderControlProps = {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
};

type ProcessingResultLine = {
  id: string;
  name: string;
  quantity: number;
  mark: string;
  result: "Ожидает проверки" | "Проверено" | "Ошибка маркировки";
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3
  }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

function OrderControlDetailsPanel({
  lines,
  order
}: {
  lines: OrderItem[];
  order: Order;
}) {
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

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
          {order.site} • {order.shipment_store_name} • {order.delivery_time}
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <input
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none ring-2 ring-slate-100 transition focus:border-violet-500 focus:ring-violet-100"
          placeholder="Найти товар по штрихкоду"
          type="search"
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
                key={line.productId}
              >
                <td className="max-w-64 truncate border-b border-slate-100 px-3 py-2 font-medium text-slate-900">
                  {line.productName}
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
                <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600" />
                <td className="border-b border-slate-100 px-3 py-2 text-slate-600" />
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

function OrderProcessingResultsPanel({
  lines
}: {
  lines: ProcessingResultLine[];
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-base font-bold text-slate-950">
          Результаты обработки
        </h3>
        <div className="mt-1 text-sm text-slate-500">
          Проверка фактического количества, маркировки и сканирования.
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <input
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none ring-2 ring-slate-100 transition focus:border-violet-500 focus:ring-violet-100"
          placeholder="Поиск (Ctrl+F)"
          type="search"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[620px] w-full border-collapse text-left text-sm">
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
              <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                Результат проверки
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr className="odd:bg-white even:bg-slate-50/60" key={line.id}>
                <td className="max-w-56 truncate border-b border-slate-100 px-3 py-2 font-medium text-slate-900">
                  {line.name}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatNumber(line.quantity)}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-slate-600">
                  {line.mark}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {line.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function OrderControl({
  isOpen,
  onClose,
  order
}: OrderControlProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || order === null) {
    return null;
  }

  const lines = order.items;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center bg-slate-950/35 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        aria-modal="true"
        className="mx-auto flex h-[88vh] w-full max-w-[92rem] flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Контроль сборки заказа
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Форма сборки и проверки заказа № {order.number}
            </p>
          </div>
          <button
            className="self-start rounded-lg border border-transparent px-3 py-1.5 text-sm font-bold text-slate-900 transition hover:bg-slate-300 focus:bg-slate-300 focus:outline-none"
            type="button"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
          <OrderControlDetailsPanel lines={lines} order={order} />
          <OrderProcessingResultsPanel lines={[]} />
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-4">
          <button
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-base font-bold text-white shadow-sm transition hover:bg-violet-700 focus:bg-violet-700 focus:outline-none"
            type="button"
            onClick={onClose}
          >
            Завершить контроль
          </button>
        </div>
      </div>
    </div>
  );
}
