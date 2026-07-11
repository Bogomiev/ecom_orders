"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Order } from "@/entities/order";

const CONFIRMATION_DEADLINE_MINUTES = 5;

const SITE_BADGE_CLASS_BY_SITE: Record<string, string> = {
  "Wildberries": "border-pink-200 bg-pink-50 text-pink-600",
  "ЯндексGO": "border-orange-200 bg-orange-50 text-orange-700",
  "Яндекс Маркет": "border-orange-200 bg-orange-50 text-orange-700",
  "Яндекс Еда": "border-orange-200 bg-orange-50 text-orange-700",
  "Сайт": "border-blue-200 bg-blue-50 text-blue-600",
  "Ozon": "border-cyan-200 bg-cyan-50 text-cyan-700",
  "Ручной": "border-slate-200 bg-slate-50 text-slate-700",
  "Самовывоз": "border-emerald-200 bg-emerald-50 text-emerald-600",
  "Купер": "border-emerald-200 bg-emerald-50 text-emerald-600"
};

const DEFAULT_SITE_BADGE_CLASS = "border-amber-200 bg-amber-100 text-orange-700";

const TONE_CLASS_BY_TONE = {
  green: {
    card: "border-emerald-200 bg-emerald-50/25 text-emerald-700",
    line: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  red: {
    card: "border-red-200 bg-red-50/20 text-red-700",
    line: "bg-red-500",
    pill: "border-red-500 bg-red-500 text-white"
  },
  yellow: {
    card: "border-amber-200 bg-amber-50/30 text-amber-700",
    line: "bg-amber-500",
    pill: "border-amber-200 bg-amber-100 text-amber-700"
  }
} as const;

type OrderCardMiniTone = keyof typeof TONE_CLASS_BY_TONE;

type OrderCardMiniProps = {
  isOpening?: boolean;
  onOpen: (order: Order) => void;
  order: Order;
};

function parseDateTime(value: string) {
  return new Date(value.replace(" ", "T"));
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatDeadlineTime(value: string) {
  const date = parseDateTime(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatPositions(value: number) {
  return `${value} поз.`;
}

function formatCountdown(deadline: Date, now: Date) {
  if (Number.isNaN(deadline.getTime())) {
    return "--:--:--";
  }

  const diffSeconds = Math.floor((deadline.getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);
  const seconds = absoluteSeconds % 60;
  const pad = (part: number) => part.toString().padStart(2, "0");
  const sign = diffSeconds < 0 ? "-" : "";

  return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function getSiteBadgeClass(site: string) {
  return SITE_BADGE_CLASS_BY_SITE[site] ?? DEFAULT_SITE_BADGE_CLASS;
}

function getActionDeadline(order: Order) {
  if (order.extended_status === "Ожидает подтверждения") {
    return addMinutes(
      parseDateTime(order.order_created_at),
      CONFIRMATION_DEADLINE_MINUTES
    );
  }

  return parseDateTime(order.confirmation_date);
}

function getOrderTone(deadline: Date, now: Date): OrderCardMiniTone {
  if (Number.isNaN(deadline.getTime())) {
    return "yellow";
  }

  const secondsLeft = Math.floor((deadline.getTime() - now.getTime()) / 1000);

  if (secondsLeft < 0) {
    return "red";
  }

  if (secondsLeft <= 60) {
    return "yellow";
  }

  return "green";
}

function getStatusLabel(order: Order, tone: OrderCardMiniTone) {
  if (tone === "red") {
    return "Просрочен";
  }

  if (order.extended_status === "Ожидает подтверждения") {
    return "До подтверждения осталось";
  }

  return "До сборки осталось";
}

function OrderCardMiniComponent({
  isOpening = false,
  onOpen,
  order
}: OrderCardMiniProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const actionDeadline = useMemo(() => getActionDeadline(order), [order]);
  const deadlineTime = useMemo(
    () => formatDeadlineTime(order.delivery_date),
    [order.delivery_date]
  );
  const tone = getOrderTone(actionDeadline, now);
  const toneClass = TONE_CLASS_BY_TONE[tone];
  const statusLabel = getStatusLabel(order, tone);
  const countdown = formatCountdown(actionDeadline, now);
  const siteBadgeClass = useMemo(() => getSiteBadgeClass(order.site), [order.site]);
  const accessibleLabel = `${order.site}, ${formatPositions(order.items.length)}, ${formatMoney(order.order_sum)} рублей, ${statusLabel}, ${countdown}`;

  useEffect(() => {
    const card = cardRef.current;

    if (card === null || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: "120px 0px"
      }
    );

    observer.observe(card);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isVisible || isOpening) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpening, isVisible]);

  return (
    <button
      ref={cardRef}
      aria-label={accessibleLabel}
      className={`group relative w-full overflow-hidden rounded-[1.25rem] border px-3.5 py-2 text-left transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 active:translate-y-0 disabled:cursor-wait disabled:opacity-70 ${toneClass.card}`}
      disabled={isOpening}
      type="button"
      onClick={() => onOpen(order)}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex min-h-[1.4rem] shrink-0 items-center rounded-full border px-2.5 text-xs font-extrabold leading-none ${siteBadgeClass}`}
        >
          {order.site}
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-x-1.5 whitespace-nowrap text-xs font-extrabold tabular-nums">
          <span>{formatPositions(order.items.length)}</span>
          <span className="opacity-45">·</span>
          <span>{formatMoney(order.order_sum)} ₽</span>
          <span className="opacity-45">·</span>
          <span>{deadlineTime}</span>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={`inline-flex min-h-5 items-center whitespace-nowrap rounded-full border px-2.5 text-[0.65rem] font-extrabold leading-none ${toneClass.pill}`}
        >
          {statusLabel}
        </span>
        <span
          className={`inline-flex min-h-5 items-center whitespace-nowrap rounded-full border px-2.5 text-[0.65rem] font-extrabold leading-none tabular-nums ${toneClass.pill}`}
        >
          {isOpening ? "..." : countdown}
        </span>
      </div>

      <div className="absolute inset-x-3.5 bottom-0 h-0.5 rounded-t-full bg-white/40">
        <div className={`h-full rounded-t-full ${toneClass.line}`} />
      </div>
    </button>
  );
}

export const OrderCardMini = memo(OrderCardMiniComponent);
