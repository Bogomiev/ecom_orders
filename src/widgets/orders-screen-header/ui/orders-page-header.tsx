const SHOP_NAME = "Икорный";

type OrdersPageHeaderProps = {
  currentTime: Date;
  ordersCount: number;
};

type HeaderMetricCardProps = {
  className?: string;
  label: string;
  value: string | number;
};

const HEADER_LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-[0.22em] text-slate-400";

function formatCurrentTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}

function HeaderMetricCard({
  className = "min-w-36",
  label,
  value
}: HeaderMetricCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm shadow-slate-300/40 ${className}`}
    >
      <div className={HEADER_LABEL_CLASS}>{label}</div>
      <div className="mt-2 text-3xl font-bold leading-none text-slate-950">
        {value}
      </div>
    </div>
  );
}

export function OrdersHeaderTitle() {
  return (
    <div>
      <div className={HEADER_LABEL_CLASS}>{SHOP_NAME}</div>
      <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">
        Экран сборки заказов
      </h1>
    </div>
  );
}

export function CurrentTimeCard({ currentTime }: { currentTime: Date }) {
  return (
    <HeaderMetricCard label="Сейчас" value={formatCurrentTime(currentTime)} />
  );
}

export function OrdersCountCard({ ordersCount }: { ordersCount: number }) {
  return (
    <HeaderMetricCard
      className="min-w-28"
      label="На экране"
      value={ordersCount}
    />
  );
}

export function OrdersPageHeader({
  currentTime,
  ordersCount
}: OrdersPageHeaderProps) {
  return (
    <header className="w-full rounded-3xl border border-white/80 bg-blue-50/70 px-6 py-5 shadow-sm shadow-slate-200/60">
      <OrdersHeaderTitle />
      <div className="mt-3 flex flex-wrap gap-3">
        <CurrentTimeCard currentTime={currentTime} />
        <OrdersCountCard ordersCount={ordersCount} />
      </div>
    </header>
  );
}
