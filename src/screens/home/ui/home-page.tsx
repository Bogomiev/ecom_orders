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

  return (
    <PageShell>
      <div className="space-y-3">
        <OrdersPageHeader ordersCount={ordersCount} />

        <div className="grid min-h-[calc(100vh-1.5rem)] gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <WidgetPanel
          className="md:col-span-2 xl:col-span-1"
          count={ordersCount}
          title="Список заказов для сборки"
        >
          <OrdersList
            layout="list"
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
