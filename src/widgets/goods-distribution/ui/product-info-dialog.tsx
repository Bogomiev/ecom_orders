"use client";

import { ZodError } from "zod";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { formatReceiptDate, fetchProductInfo, type Product, type ProductInfo } from "@/entities/product";
import { createBarcodeIndex, parseScannedCode } from "@/features/orders/model/scan-order";
import { HonestSignIcon } from "@/features/orders/ui/order-control/order-control-details-panel";
import { BARCODE_SCANNER_CAPTURE_EVENT, formatMoney, formatNumber } from "@/features/orders/ui/order-control/order-control-shared";
import { Dialog } from "@/shared/ui/dialog";
import { fetchProducts } from "@/widgets/orders-list/api/orders";
import { findDisplayBarcode, isNumericBarcode } from "@/shared/lib/barcode-format";
import { ProductBarcode } from "@/shared/ui/product-barcode";
import { ProductInfoIcon } from "./product-info-icon";

export function ProductInfoDialog({ storeId, onClose }: { storeId?: string; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const productsRef = useRef<Promise<Product[]> | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ProductInfo[]>([]);
  const [selected, setSelected] = useState<ProductInfo | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function search(value: string, scanned = false) {
    const term = value.trim();
    if (!term || !storeId) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setQuery(term);
    setBusy(true);
    setMessage(null);
    setItems([]);
    setResultsOpen(false);
    setSelected(null);
    try {
      let lookup = term;
      let products: Product[] = [];
      let searchById = false;
      if (isNumericBarcode(term)) {
        if (!productsRef.current) productsRef.current = fetchProducts().catch((error) => { productsRef.current = null; throw error; });
        products = await productsRef.current;
        if (controller.signal.aborted) return;
        const index = createBarcodeIndex(products);
        const match = index.get(term) ?? parseScannedCode(term).lookupBarcodes.map((barcode) => index.get(barcode)).find(Boolean);
        if (scanned && !match) throw new Error(`По штрихкоду ${term} товар не найден`);
        if (match) {
          lookup = match.product.uid;
          searchById = true;
        }
      }
      const found = await fetchProductInfo(storeId, lookup, products, searchById, controller.signal);
      if (controller.signal.aborted) return;
      setItems(found);
      setResultsOpen(found.length > 1);
      setSelected(found.length === 1 ? found[0] : null);
      if (!found.length) setMessage("Товар не найден");
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof ZodError ? "Не удалось прочитать данные товара: сервер вернул неожиданный формат ответа" : error instanceof Error ? error.message : "Не удалось загрузить товар");
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }

  const scan = useEffectEvent((value: string) => { void search(value, true); });
  useEffect(() => {
    inputRef.current?.focus();
    let buffer = "";
    let lastAt = 0;
    function capture(event: KeyboardEvent) {
      if (event.isComposing) return;
      if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        buffer = event.timeStamp - lastAt > 80 ? event.key : buffer + event.key;
        lastAt = event.timeStamp;
        return;
      }
      if (event.key === "Shift") return;
      if (event.key === "Enter" && buffer.length >= 6 && event.timeStamp - lastAt <= 80) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.dispatchEvent(new Event(BARCODE_SCANNER_CAPTURE_EVENT));
        scan(buffer);
      }
      buffer = "";
    }
    window.addEventListener("keydown", capture, { capture: true });
    return () => {
      window.removeEventListener("keydown", capture, { capture: true });
      requestRef.current?.abort();
    };
  }, []);

  return <Dialog ariaLabelledBy="product-info-title" className="flex max-h-[calc(100dvh-24px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl app-surface shadow-2xl" onClose={onClose}>
    <header className="flex items-center justify-between gap-3 border-b app-border px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700"><ProductInfoIcon /></span><h2 id="product-info-title" className="text-lg font-bold app-text">Информация о товаре</h2></div>
      <button aria-label="Закрыть" className="h-9 w-9 shrink-0 rounded-lg border app-border text-xl app-muted" onClick={onClose}>×</button>
    </header>
    <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
      <form onSubmit={(event) => { event.preventDefault(); void search(query); }}>
        <label htmlFor="product-info-query" className="mb-2 block text-sm font-semibold app-text">Штрихкод, код или наименование товара</label>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <input
              ref={inputRef} autoFocus autoComplete="off" id="product-info-query"
              aria-controls={resultsOpen ? "product-info-results" : undefined}
              className={`h-11 w-full min-w-0 border app-border app-surface px-3 text-base app-text outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${resultsOpen ? "rounded-t-lg" : "rounded-lg"}`}
              placeholder="Отсканируйте или введите…" value={query}
              onChange={(event) => { setQuery(event.target.value); setResultsOpen(false); setItems([]); }}
              onFocus={(event) => event.target.select()}
              onClick={() => { if (items.length > 1) setResultsOpen(true); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && resultsOpen) {
                  event.preventDefault();
                  document.querySelector<HTMLButtonElement>("#product-info-results button")?.focus();
                }
              }}
            />
            {resultsOpen ? (
              <ul id="product-info-results" aria-label="Результаты поиска товара" className="max-h-64 overflow-y-auto overscroll-contain rounded-b-lg border border-t-0 app-border app-surface shadow-sm">
                {items.map((item) => (
                  <li key={item.id} className="border-b app-border last:border-0">
                    <button
                      type="button"
                      className="product-info-result block w-full px-3 py-3 text-left text-sm app-text transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-400"
                      onClick={() => { setSelected(item); setResultsOpen(false); inputRef.current?.focus(); }}
                    >
                      <span className="block break-words text-xs opacity-70">Код: {item.code}</span>
                      <span className="mt-1 block break-words font-medium">Наименование: {item.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50" disabled={!storeId || !query.trim() || busy} type="submit">Найти</button>
        </div>
      </form>
      {!storeId ? <p className="mt-4 text-sm app-muted">Выберите торговую точку</p> : null}
      <div aria-live="polite" role="status">{busy ? <p className="py-6 text-sm app-muted">Поиск товара…</p> : message ? <p className="mt-4 rounded-lg app-surface-muted p-4 text-sm app-text">{message}</p> : null}</div>

      {selected ? <ProductCard key={selected.id} product={selected} /> : !busy && !message && items.length === 0 ? <p className="py-10 text-center text-sm app-muted">Отсканируйте товар или воспользуйтесь поиском</p> : null}
    </div>
  </Dialog>;
}

function ProductCard({ product }: { product: ProductInfo }) {
  const [imageFailed, setImageFailed] = useState(false);
  const barcode = findDisplayBarcode(product.barcodes);
  const photo = product.images[0];
  const receipt = product.receipts[0];
  const marketplaces = [
    ["Интернет-магазин", product.price_eshop, product.promo_price_eshop],
    ["Озон", product.price_ozon, product.promo_price_ozon],
    ["Яндекс.Еда", product.price_yandex_eats, product.promo_price_yandex_eats]
  ] as const;
  return <article className="mt-6 app-text">
    <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
      <div className="min-w-0"><p className="text-xs font-medium app-muted">Код: {product.code}</p><h3 className="mt-2 flex items-start gap-2 text-lg font-bold leading-snug"><span className="shrink-0">{product.markingType !== "БезОсобенностейУчета" ? <HonestSignIcon /> : null}</span><span className="break-words">{product.name}</span></h3>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm"><div className="col-span-2 min-w-0"><dt className="app-muted">Штрихкод</dt><dd className="mt-1"><ProductBarcode value={barcode} /></dd></div>{[["Тип", product.isWeight ? "Весовой" : "Штучный"], ["Цена", formatMoney(product.price)], ["Остаток", formatNumber(product.stock)], ["Терморежим", product.isThermalMode ? "Да" : "Нет"]].map(([label, value]) => <div key={label}><dt className="app-muted">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums">{value}</dd></div>)}</dl>
      </div>
      <div className="flex aspect-square w-full max-w-[240px] items-center justify-center justify-self-center overflow-hidden rounded-xl border app-border p-3 sm:max-w-none">
        {photo && !imageFailed ? /* eslint-disable-next-line @next/next/no-img-element */
          <img alt={product.name} className="h-full w-full object-contain" decoding="async" height={240} loading="lazy" src={photo} width={240} onError={() => setImageFailed(true)} /> : <span className="text-sm app-muted">Нет фото</span>}
      </div>
    </div>
    {receipt ? <section className="mt-7 min-w-0 text-sm" aria-labelledby="product-receipts-title">
      <h4 id="product-receipts-title" className="app-muted">Поступление</h4>
      <p className="mt-1 overflow-x-auto whitespace-nowrap font-semibold tabular-nums">
        {receipt.type} {receipt.number} от {formatReceiptDate(receipt.date)}, поставщик: {receipt.supplier}
      </p>
    </section> : null}
    <section className="mt-7"><h4 className="mb-3 font-bold">Торговые площадки</h4><table className="w-full text-left text-sm"><thead><tr className="border-b app-border text-xs app-muted"><th className="py-3 pr-2 font-medium" scope="col">Площадка</th><th className="px-2 py-3 text-right font-medium" scope="col">Цена</th><th className="py-3 pl-2 text-right font-medium" scope="col">Цена промо</th></tr></thead><tbody>{marketplaces.map(([name, price, promo]) => <tr className="border-b app-border last:border-0" key={name}><th className="py-4 pr-2 font-medium" scope="row">{name}</th><td className="px-2 py-4 text-right tabular-nums">{formatMoney(price)}</td><td className="py-4 pl-2 text-right tabular-nums">{formatMoney(promo)}</td></tr>)}</tbody></table></section>
  </article>;
}
