"use client";

import { useState } from "react";
import type { ProductsResponse } from "@/entities/product";
import { WidgetPanel } from "@/shared/ui/widget-panel";
import { fetchProducts } from "@/widgets/orders-list/api/orders";
import { ProductCountingDialog } from "./product-counting-dialog";

export function GoodsDistribution() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductsResponse>([]);

  async function openProductCounting() {
    setIsOpen(true);
    if (products.length > 0 || isLoading) return;

    setIsLoading(true);
    setLoadError(null);
    try {
      setProducts(await fetchProducts());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Не удалось загрузить список товаров");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <WidgetPanel accent="teal" count={0} description="Товародвижение · заказы" icon="cube" title="Товары">
        <button className="flex w-full items-center gap-3 rounded-xl border app-border app-surface-muted px-3 py-3 text-left text-sm font-extrabold app-text transition hover:border-teal-400 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400" type="button" onClick={() => void openProductCounting()}>
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 7h16M6 3v4m12-4v4M6 11h2m3 0h2m3 0h2M6 15h2m3 0h2m3 0h2M6 19h2m3 0h2" /><rect height="18" rx="2" width="18" x="3" y="3" /></svg>
          </span>
          <span>Подсчет товара</span>
        </button>
      </WidgetPanel>
      {isOpen ? <ProductCountingDialog isLoading={isLoading} isOpen loadError={loadError} products={products} onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}
