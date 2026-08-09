"use client";

import { useState } from "react";
import { useOrderHistoryDays } from "@/entities/order";
import { PageShell } from "@/shared/ui/page-shell";
import { WidgetPanel } from "@/shared/ui/widget-panel";
import { GoodsDistribution } from "@/widgets/goods-distribution";
import { KeyIndicators } from "@/widgets/key-indicators";
import { OrdersList } from "@/widgets/orders-list";
import { OrdersPageHeader } from "@/widgets/orders-screen-header";
import { PricePrinting } from "@/widgets/price-printing";
import { ServiceDesk } from "@/widgets/service-desk";

export function HomePage() {
  const [ordersCount, setOrdersCount] = useState(0);
  const [notificationOrdersCount, setNotificationOrdersCount] = useState(0);
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(false);
  const historyDays = useOrderHistoryDays();

  return (
    <PageShell>
      <div>
        <OrdersPageHeader ordersCount={notificationOrdersCount} />

        <div className="dashboard-grid grid items-start md:grid-cols-2 xl:grid-cols-5">
        <WidgetPanel
          accent="blue"
          className="md:col-span-2 xl:col-span-1"
          count={ordersCount}
          description="Обработка и сборка"
          icon="cart"
          headerAction={(
            <button
              aria-label={isHistoryEnabled ? "Скрыть историю заказов" : "Показать историю заказов"}
              aria-pressed={isHistoryEnabled}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition ${
                isHistoryEnabled
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "app-border app-surface-muted app-muted hover:border-blue-400 hover:text-blue-600"
              }`}
              title={`Выданные и отмененные заказы за ${historyDays} дн.`}
              type="button"
              onClick={() => setIsHistoryEnabled((enabled) => !enabled)}
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5M12 7v5l3 2" />
              </svg>
            </button>
          )}
          title="Интернет-заказы"
        >
          <OrdersList
            layout="list"
            historyDays={isHistoryEnabled ? historyDays : undefined}
            onNotificationOrdersCountChange={setNotificationOrdersCount}
            onOrdersCountChange={setOrdersCount}
          />
        </WidgetPanel>

        <GoodsDistribution />
        <PricePrinting />
        <ServiceDesk />
        <KeyIndicators />
        </div>
      </div>
    </PageShell>
  );
}
