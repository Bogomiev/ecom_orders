import {
  formatOrderMoney,
  getMarketplaceLabel,
  getOrderStatusLabel,
  type Order,
  type OrderTone
} from "@/entities/order";

export function OrderCardHeader({ order }: { order: Order }) {
  const marketplace = getMarketplaceLabel(order.source);
  return (
    <div className="order-card-header flex flex-wrap items-center gap-2.5">
      <span className={`marketplace-badge marketplace-${marketplace.toLowerCase()} inline-flex min-h-6 items-center rounded-md px-2.5 text-xs font-extrabold`}>
        {marketplace}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium app-muted">
        #{order.number}
      </span>
      <span className="delivery-badge inline-flex min-h-7 shrink-0 items-center rounded-md border app-border app-surface px-2.5 text-xs font-extrabold">
        {order.source.toLowerCase().includes("сайт") ? "Самовывоз" : "Доставка"}
      </span>
    </div>
  );
}

export function OrderStatusBadge({ order, tone }: { order: Order; tone: OrderTone }) {
  return (
    <span className={`order-status-pill mt-2 inline-flex min-h-7 items-center gap-2 rounded-full px-3 text-xs font-extrabold order-status-${tone}`}>
      <span className="status-dot h-2 w-2 rounded-full" />
      {getOrderStatusLabel(order)}
    </span>
  );
}

export function OrderMeta({
  assembleBefore,
  className = "mt-3",
  order
}: {
  assembleBefore: string;
  className?: string;
  order: Order;
}) {
  return (
    <div className={`${className} order-card-meta grid grid-cols-3 gap-2`}>
      <div><span className="order-meta-label">Позиций</span><strong className="order-meta-value">{order.items.length}</strong></div>
      <div><span className="order-meta-label">Сумма</span><strong className="order-meta-value">{formatOrderMoney(order.order_sum)} ₽</strong></div>
      <div><span className="order-meta-label">Собрать до</span><strong className="order-meta-value">{assembleBefore}</strong></div>
    </div>
  );
}
