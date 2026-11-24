"use client";

import React, { useCallback, useState, type ReactNode } from "react";
import { formatReceiptDate, type ProductInfo } from "../../../entities/product/model/info";
import { findDisplayBarcode } from "../../../shared/lib/barcode-format";
import { stopperTextColor, type PriceTagStopper } from "../../../entities/price-tag/model";
import type { TagView } from "../../price-tag-task/model/price-tag-task";
import { PriceTag, priceTagSheetCss } from "../../price-tag-task/ui/price-tag-sheet";

export function priceTagPeriod(product: Pick<ProductInfo, "price_promo" | "price_from" | "price_promo_from" | "price_promo_to">) {
  if (product.price_promo <= 0) return `с ${formatReceiptDate(product.price_from)}`;
  const from = formatReceiptDate(product.price_promo_from);
  const to = formatReceiptDate(product.price_promo_to);
  const sameYear = from !== "—" && to !== "—" && from.slice(-4) === to.slice(-4);
  return `с ${sameYear ? from.slice(0, 5) : from} по ${to}`;
}

// The tag of the card is the printed one: a discount while a promotion runs, otherwise a regular tag;
// weighed goods are priced per kilogram and show the product code instead of a barcode.
export function productTagView(product: Pick<ProductInfo, "code" | "name" | "price" | "price_promo" | "isWeight" | "barcodes">): TagView {
  const promo = product.price_promo > 0;
  return {
    name: product.name, unit: product.isWeight ? "кг" : "шт", barcode: product.isWeight ? "" : findDisplayBarcode(product.barcodes) ?? "", code: product.isWeight ? product.code : "",
    price: promo ? product.price_promo : product.price, old: promo ? product.price : null, state: promo ? "promo" : "regular"
  };
}

// 60 mm at 96 dpi: the printed tag is scaled to the width of the card column.
const tagWidthPx = 60 * 96 / 25.4;
const today = () => new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Vladivostok" }).format(new Date());

// The price tag of the card, exactly as printed (60 × 47 mm). Tags are not printed from here: children put the
// product into the store's «Печать ценников» task (see PriceTagTaskControl). A stopper on the shelf fills the
// space around the tag with its color and shows its name.
export function ProductPriceTag({ product, stopper, children }: { product: ProductInfo; stopper?: PriceTagStopper | null; children?: ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setZoom(Math.min(1.6, entry.contentRect.width / tagWidthPx)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const tag = <div ref={measure} className="w-full">
    <div className="pt-sheet mx-auto w-fit" style={{ zoom }}><PriceTag tag={productTagView(product)} date={today()} /></div>
  </div>;
  return <section aria-label="Ценник товара" className="flex h-full min-w-0 flex-col gap-3 rounded-2xl border app-border app-surface-muted p-4">
    <style>{priceTagSheetCss}</style>
    {stopper ? <div className="mx-auto w-full max-w-[336px] rounded-xl p-2 pt-1.5" style={{ backgroundColor: stopper.color, color: stopperTextColor(stopper.color) }} title="Стоппер на полке">
      <p className="truncate px-1 pb-1.5 text-center text-sm font-extrabold uppercase tracking-wide">{stopper.name}</p>
      {tag}
    </div> : <div className="mx-auto w-full max-w-[336px]">{tag}</div>}
    <div className="mt-auto flex flex-col gap-2">
      <p className="min-w-0 text-sm font-semibold app-muted">{priceTagPeriod(product)}</p>
      {children}
    </div>
  </section>;
}
