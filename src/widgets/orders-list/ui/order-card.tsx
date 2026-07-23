"use client";

import { memo, useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Order } from "@/entities/order";
import { parseMoscowDateTime } from "@/shared/lib/date-time";

const CONFIRMATION_DEADLINE_MINUTES = 5;
const ASSEMBLY_DEADLINE_MINUTES = 10;

const SITE_BADGE_CLASS_BY_SITE: Record<string, string> = {
  "Wildberries": "bg-pink-50 text-pink-600",
  "ЯндексGO": "bg-orange-50 text-orange-700",
  "Яндекс Маркет": "bg-orange-50 text-orange-700",
  "Яндекс Еда": "bg-orange-50 text-orange-700",
  "Сайт": "bg-blue-50 text-blue-600",
  "Ozon": "bg-cyan-50 text-cyan-700",
  "Ручной": "bg-slate-50 text-slate-700",
  "Самовывоз": "bg-emerald-50 text-emerald-600",
  "Купер": "bg-emerald-50 text-emerald-600"
};

type CardTone = "green" | "yellow" | "red";

const TONE_CLASSES: Record<CardTone, {
  action: string;
  border: string;
  panel: string;
  status: string;
  timer: string;
}> = {
  green: {
    action: "bg-emerald-600 hover:bg-emerald-700",
    border: "border-slate-200",
    panel: "border-emerald-200 bg-emerald-50/40",
    status: "border-emerald-200 bg-emerald-50 text-emerald-700",
    timer: "text-emerald-700"
  },
  yellow: {
    action: "bg-amber-500 hover:bg-amber-600",
    border: "border-amber-200",
    panel: "border-amber-200 bg-amber-50/70",
    status: "border-amber-200 bg-amber-50 text-amber-700",
    timer: "text-amber-700"
  },
  red: {
    action: "bg-red-600 hover:bg-red-700",
    border: "border-red-300",
    panel: "border-red-200 bg-red-50/70",
    status: "border-red-500 bg-red-600 text-white",
    timer: "text-red-700"
  }
};

type OrderCardProps = {
  isConfirming?: boolean;
  isOpening?: boolean;
  onCollapse: () => void;
  onConfirm: (order: Order) => void;
  onStartControl: (order: Order) => void;
  order: Order;
};

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getActionDeadline(order: Order) {
  return order.extended_status === "Ожидает подтверждения"
    ? addMinutes(
        parseMoscowDateTime(order.order_created_at),
        CONFIRMATION_DEADLINE_MINUTES
      )
    : addMinutes(
        parseMoscowDateTime(order.confirmation_date),
        ASSEMBLY_DEADLINE_MINUTES
      );
}

function getTone(deadline: Date, now: Date): CardTone {
  const secondsLeft = Math.floor((deadline.getTime() - now.getTime()) / 1000);

  if (Number.isNaN(secondsLeft) || secondsLeft <= 60) {
    return secondsLeft < 0 ? "red" : "yellow";
  }

  return "green";
}

function formatCountdown(deadline: Date, now: Date) {
  if (Number.isNaN(deadline.getTime())) return "--:--:--";

  const diffSeconds = Math.floor((deadline.getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);
  const seconds = absoluteSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${diffSeconds < 0 ? "-" : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

function OrderCardComponent({
  isConfirming = false,
  isOpening = false,
  onCollapse,
  onConfirm,
  onStartControl,
  order
}: OrderCardProps) {
  const [now, setNow] = useState(() => new Date());
  const deadline = useMemo(() => getActionDeadline(order), [order]);
  const tone = getTone(deadline, now);
  const classes = TONE_CLASSES[tone];
  const isConfirmation = order.extended_status === "Ожидает подтверждения";
  const isAwaitingAssembly = order.extended_status === "Ожидает сборку";
  const isOverdue = tone === "red";
  const statusLabel = isOverdue
    ? "Просрочен"
    : isConfirmation
      ? "До подтверждения осталось"
      : "До сборки осталось";
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  function handleStartControl(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onStartControl(order);
  }

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onConfirm(order);
  }

  return (
    <article
      className={`w-full cursor-pointer rounded-[1.25rem] border bg-white px-3.5 py-3 text-left shadow-sm ${classes.border}`}
      role="button"
      tabIndex={0}
      onClick={onCollapse}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCollapse();
        }
      }}
    >
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${SITE_BADGE_CLASS_BY_SITE[order.source] ?? "bg-amber-50 text-orange-700"}`}>
          {order.source}
        </span>
        <h3 className="text-base font-extrabold text-slate-950">№ {order.number}</h3>
      </div>

      <div className={`mt-2.5 rounded-2xl border px-3.5 py-3 ${classes.panel}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-extrabold ${classes.status}`}>
            {statusLabel}
          </span>
          <div className={`text-right text-2xl font-extrabold leading-none tabular-nums ${classes.timer}`}>
            {isOpening ? "..." : formatCountdown(deadline, now)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-600">
        <span>{order.items.length} поз.</span>
        <strong className="text-base font-extrabold text-slate-950">{formatMoney(order.order_sum)} ₽</strong>
      </div>

      {isConfirmation ? (
        <button
          className={`mt-3 min-h-10 w-full rounded-xl px-4 text-sm font-extrabold text-white transition disabled:cursor-wait disabled:opacity-70 ${classes.action}`}
          disabled={isConfirming}
          type="button"
          onClick={handleConfirm}
        >
          {isConfirming ? "Подтверждаем..." : "Подтвердить заказ"}
        </button>
      ) : null}
      {isAwaitingAssembly ? (
        <button
          className={`mt-3 min-h-10 w-full rounded-xl px-4 text-sm font-extrabold text-white transition disabled:cursor-wait disabled:opacity-70 ${classes.action}`}
          disabled={isOpening}
          type="button"
          onClick={handleStartControl}
        >
          {isOpening ? "Открываем..." : "Начать сборку"}
        </button>
      ) : null}
    </article>
  );
}

export const OrderCard = memo(OrderCardComponent);
