"use client";

import { useState } from "react";
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
          title="Интернет-заказы"
        >
          <OrdersList
            layout="list"
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
