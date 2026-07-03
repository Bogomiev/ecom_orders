"use client";

import { useEffect, useRef, useState } from "react";
import type { Order, OrdersResponse } from "@/entities/order";
import { OrdersPageHeader } from "@/widgets/orders-screen-header";
import {
  fetchOrders,
  ORDERS_REFRESH_INTERVAL_SECONDS
} from "../api/orders";

type OrdersState = {
  data: OrdersResponse | null;
  error: string | null;
  isLoading: boolean;
  lastUpdatedAt: Date | null;
};

const initialState: OrdersState = {
  data: null,
  error: null,
  isLoading: true,
  lastUpdatedAt: null
};

const DEFAULT_SITE_BADGE_CLASS = "bg-amber-100 text-orange-700";

const SITE_BADGE_CLASS_BY_SITE: Record<string, string> = {
  "ЯндексGO": DEFAULT_SITE_BADGE_CLASS,
  "Яндекс Маркет": "bg-orange-100 text-orange-700",
  "Сайт": "bg-blue-100 text-blue-700",
  "Ozon": "bg-cyan-100 text-cyan-700"
};

function isSameOrdersResponse(
  currentData: OrdersResponse | null,
  nextData: OrdersResponse
) {
  return currentData !== null && JSON.stringify(currentData) === JSON.stringify(nextData);
}

function parseDateTime(value: string) {
  return new Date(value.replace(" ", "T"));
}

function formatDeliveryDeadline(value: string) {
  const date = parseDateTime(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatCountdown(deadlineValue: string, now: Date) {
  const deadline = parseDateTime(deadlineValue);

  if (Number.isNaN(deadline.getTime())) {
    return "00:00:00";
  }

  const secondsLeft = Math.max(
    0,
    Math.floor((deadline.getTime() - now.getTime()) / 1000)
  );
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function getStatusColor(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("собран")) {
    return "bg-sky-100 text-sky-800 ring-sky-200";
  }

  if (normalizedStatus.includes("нов")) {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function getSiteBadgeClass(site: string) {
  return SITE_BADGE_CLASS_BY_SITE[site] ?? DEFAULT_SITE_BADGE_CLASS;
}

function InfoIcon({ type }: { type: "box" | "phone" | "clock" }) {
  const commonProps = {
    className: "h-3.5 w-3.5 flex-none text-slate-400 xl:h-4 xl:w-4",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24"
  };

  if (type === "phone") {
    return (
      <svg aria-hidden="true" {...commonProps}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.95.34 1.88.66 2.76a2 2 0 0 1-.45 2.11L8.05 9.86a16 16 0 0 0 6.09 6.09l1.27-1.27a2 2 0 0 1 2.11-.45c.88.32 1.81.54 2.76.66A2 2 0 0 1 22 16.92Z" />
      </svg>
    );
  }

  if (type === "clock") {
    return (
      <svg aria-hidden="true" {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" {...commonProps}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="M4 12.5 12 17l8-4.5" />
      <path d="M4 17.5 12 22l8-4.5" />
    </svg>
  );
}

function OrderCard({ order, now }: { order: Order; now: Date }) {
  const countdown = formatCountdown(order.delivery_date, now);
  const statusColor = getStatusColor(order.status);
  const siteBadgeClass = getSiteBadgeClass(order.site);

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${siteBadgeClass}`}
        >
          {order.site}
        </span>
        <h2 className="min-w-0 text-base font-bold text-slate-950 xl:text-lg">
          № {order.number}
        </h2>
      </div>

      <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="grid gap-2 min-[1500px]:grid-cols-[1fr_auto] min-[1500px]:items-center">
          <div className="space-y-1.5">
            <div className="text-sm font-bold uppercase tracking-normal text-slate-600 xl:text-base">
              Собрать до {formatDeliveryDeadline(order.delivery_date)}
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 xl:text-sm ${statusColor}`}
            >
              {order.status}
            </span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700 xl:text-3xl">
            {countdown}
          </div>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-slate-600 xl:text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <InfoIcon type="box" />
          <span className="min-w-0 truncate">{order.shipment_store_name}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <InfoIcon type="phone" />
          <span>Тел: {order.shipment_store_phone}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <InfoIcon type="clock" />
          <span>Интервал: {order.delivery_time}</span>
        </div>
      </div>
    </article>
  );
}

export function OrdersList() {
  const [state, setState] = useState<OrdersState>(initialState);
  const [now, setNow] = useState(() => new Date());
  const isRequestInFlightRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let activeController: AbortController | null = null;

    async function loadOrders() {
      if (isRequestInFlightRef.current) {
        return;
      }

      const controller = new AbortController();
      activeController = controller;
      isRequestInFlightRef.current = true;

      try {
        const data = await fetchOrders(controller.signal);

        if (!isMounted) {
          return;
        }

        setState((currentState) => ({
          data: isSameOrdersResponse(currentState.data, data)
            ? currentState.data
            : data,
          error: null,
          isLoading: false,
          lastUpdatedAt: new Date()
        }));
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          error:
            error instanceof Error ? error.message : "Не удалось загрузить заказы",
          isLoading: false
        }));
      } finally {
        if (activeController === controller) {
          activeController = null;
        }

        isRequestInFlightRef.current = false;
      }
    }

    loadOrders();

    const intervalId = window.setInterval(
      loadOrders,
      ORDERS_REFRESH_INTERVAL_SECONDS * 1000
    );

    return () => {
      isMounted = false;
      activeController?.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const orders = state.data?.items ?? [];
  const ordersCount = state.data?.totalItems ?? orders.length;

  return (
    <section className="space-y-3">
      <OrdersPageHeader currentTime={now} ordersCount={ordersCount} />

      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      ) : null}

      {state.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Загружаем заказы...
        </div>
      ) : null}

      {!state.isLoading && orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Заказов пока нет
        </div>
      ) : null}

      {orders.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {orders.map((order) => (
            <OrderCard key={order.id} now={now} order={order} />
          ))}
        </div>
      ) : null}

    </section>
  );
}
