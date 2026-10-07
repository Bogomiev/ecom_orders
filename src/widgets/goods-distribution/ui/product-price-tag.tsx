"use client";

import React, { useCallback, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { formatReceiptDate, type ProductInfo } from "../../../entities/product/model/info";
import { findDisplayBarcode, getBarcodeFormat } from "../../../shared/lib/barcode-format";

export function priceTagPeriod(product: Pick<ProductInfo, "price_promo" | "price_from" | "price_promo_from" | "price_promo_to">) {
  if (product.price_promo <= 0) return `с ${formatReceiptDate(product.price_from)}`;
  const from = formatReceiptDate(product.price_promo_from);
  const to = formatReceiptDate(product.price_promo_to);
  const sameYear = from !== "—" && to !== "—" && from.slice(-4) === to.slice(-4);
  return `с ${sameYear ? from.slice(0, 5) : from} по ${to}`;
}

function nameLines(name: string) {
  const lines: string[] = [];
  for (const word of name.toUpperCase().split(/\s+/)) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 44) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

export function ProductPriceTag({ product }: { product: ProductInfo }) {
  const tagRef = useRef<SVGSVGElement>(null);
  const [printError, setPrintError] = useState("");
  const promo = product.price_promo > 0;
  const [integer, fraction] = (promo ? product.price_promo : product.price).toFixed(2).split(".");
  const [oldInteger, oldFraction] = product.price.toFixed(2).split(".");
  const barcode = findDisplayBarcode(product.barcodes);
  const lines = nameLines(product.name);
  const renderBarcode = useCallback((node: SVGSVGElement | null) => {
    const format = getBarcodeFormat(barcode ?? "");
    if (node && barcode && format) {
      JsBarcode(node, barcode, { format, displayValue: false, height: 24, width: 1, margin: 0 });
      // JsBarcode replaces the SVG dimensions; retain the label's viewport.
      node.setAttribute("width", "100");
      node.setAttribute("height", "18");
      node.setAttribute("preserveAspectRatio", "none");
    }
  }, [barcode]);

  function print() {
    if (!tagRef.current) return;
    setPrintError("");
    const frame = document.createElement("iframe");
    frame.title = "Печать ценника";
    frame.style.cssText = "position:fixed;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const target = frame.contentWindow;
    if (!doc || !target) { frame.remove(); setPrintError("Не удалось открыть печать ценника"); return; }
    doc.open();
    doc.write('<!doctype html><html lang="ru"><head><title></title><style>@page{margin:0}html{background:white;color-scheme:light}body{margin:0;padding:10mm}body>svg{width:90mm;height:90mm;print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body></body></html>');
    doc.close();
    const printedTag = doc.importNode(tagRef.current, true);
    // Theme variables are not available in the isolated print document.
    printedTag.style.setProperty("--text", "#374151");
    printedTag.style.setProperty("--border", "#94a3b8");
    doc.body.appendChild(printedTag);
    target.addEventListener("afterprint", () => frame.remove(), { once: true });
    void doc.fonts.ready.then(() => {
      try { target.focus(); target.print(); } catch { frame.remove(); setPrintError("Не удалось открыть печать ценника"); }
    });
  }

  return <section aria-label="Ценник товара" className="flex h-full min-w-0 flex-col gap-3 rounded-2xl border app-border app-surface-muted p-4">
    <svg ref={tagRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 336 336" className="mx-auto w-full max-w-[336px]" role="img" aria-label={`${promo ? "Акционная" : "Регулярная"} цена ${integer},${fraction} руб. за ${product.isWeight ? "кг" : "шт"}`}>
      <path d="M30 30H324Q336 30 336 42V332Q336 336 332 336H4Q0 336 0 332V60Q0 30 30 30Z" fill={promo ? "#F6E41C" : "none"} stroke={promo ? "#F6E41C" : "var(--border, #94a3b8)"} strokeDasharray={promo ? undefined : "4 3"} />
      <text x="22" y="67" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="24" fill={promo ? "#D93A22" : "var(--text, #374151)"} textLength={promo ? undefined : 244} lengthAdjust="spacingAndGlyphs">{promo ? "СКИДКА" : "РЕГУЛЯРНАЯ ЦЕНА"}</text>
      {promo ? <g><circle cx="298" cy="35" r="32" fill="#c7b919" /><circle cx="298" cy="32" r="32" fill="#F6E41C" /><rect x="278" y="17" width="40" height="30" rx="8" fill="#D93A22" /><text x="298" y="40" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="24" fill="#F6E41C">%</text><path d="M272 68Q298 81 324 68M280 79Q298 87 316 79" fill="none" stroke="#D93A22" strokeWidth="3" strokeLinecap="round" /></g> : null}
      <rect x="17" y="84" width="302" height="237" rx="3" fill="white" />
      <g fill="#141414" fontFamily="Arial, Helvetica, sans-serif">
        {lines.map((line, index) => <text key={index} x="28" y={108 + index * Math.min(20, 65 / lines.length)} fontSize={Math.min(18, 65 / lines.length)} fontWeight="700" textLength={Math.min(278, line.length * 9)} lengthAdjust="spacingAndGlyphs">{line}</text>)}
        {promo ? <g fontFamily="Impact, Arial Narrow, sans-serif" fontWeight="900"><text x="28" y="193" fontSize="45" textLength={Math.min(105, oldInteger.length * 24)} lengthAdjust="spacingAndGlyphs">{oldInteger}</text><text x={30 + Math.min(105, oldInteger.length * 24)} y="181" fontSize="22" textDecoration="underline">{oldFraction}</text><path d={`M28 195L${60 + Math.min(105, oldInteger.length * 24)} 160`} stroke="black" strokeWidth="3" /></g> : null}
        <text x="272" y="279" textAnchor="end" fontFamily="Impact, Arial Narrow, sans-serif" fontWeight="900" fontSize="94" textLength={Math.min(220, integer.length * 40)} lengthAdjust="spacingAndGlyphs">{integer}</text>
        <text x="278" y="235" fontFamily="Impact, Arial Narrow, sans-serif" fontSize="33" fontWeight="900" textDecoration="underline">{fraction}</text>
        <text x="293" y="267" textAnchor="middle" fontSize="11" fontWeight="700">РУБ.</text><text x="293" y="280" textAnchor="middle" fontSize="11" fontWeight="700">{product.isWeight ? "КГ" : "ШТ"}</text>
        {barcode ? <g transform="translate(28 282)"><svg ref={renderBarcode} width="100" height="18" preserveAspectRatio="none" /></g> : null}
        <text x="28" y="310" fontSize="10">{new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Vladivostok" }).format(new Date())}</text>
      </g>
    </svg>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
      <p className={`min-w-0 flex-1 text-sm font-semibold ${promo ? "md:max-w-[110px]" : ""} ${promo ? "text-amber-600 dark:text-amber-300" : "app-muted"}`}>{priceTagPeriod(product)}</p>
      <button type="button" onClick={print} className="inline-flex shrink-0 items-center gap-2 rounded-lg border app-border app-surface px-2 py-2.5 text-xs lg:px-3 lg:text-sm font-semibold app-text"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9V3h12v6M6 14h12v7H6z" /><rect x="3" y="9" width="18" height="8" rx="2" /></svg>Печатать ценник</button>
    </div>
    {printError ? <p role="alert" className="text-sm text-red-600">{printError}</p> : null}
  </section>;
}
