"use client";

import { WidgetPanel } from "@/shared/ui/widget-panel";

export function PricePrinting() {
 return <WidgetPanel accent="purple" count={0} description="Текущие поручения" icon="check" title="Задания"><p className="text-sm app-text-muted">Нет текущих заданий</p></WidgetPanel>;
}
