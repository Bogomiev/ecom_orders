"use client";

import { formatSalesWeek } from "@/shared/lib/sales-week";
import { ZodError } from "zod";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { formatReceiptDate, fetchProductInfo, type Product, type ProductInfo } from "@/entities/product";
import { createBarcodeIndex, parseScannedCode } from "@/features/orders/model/scan-order";
import { HonestSignIcon } from "@/features/orders/ui/order-control/order-control-details-panel";
import { BARCODE_SCANNER_CAPTURE_EVENT, formatNumber } from "@/features/orders/ui/order-control/order-control-shared";
import { Dialog } from "@/shared/ui/dialog";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { fetchProducts } from "@/widgets/orders-list/api/orders";
import { findDisplayBarcode, getBarcodeFormat, isNumericBarcode } from "@/shared/lib/barcode-format";
import { ProductBarcode } from "@/shared/ui/product-barcode";
import { ProductPriceTag } from "./product-price-tag";
import { ProductInfoIcon } from "./product-info-icon";

export function ProductInfoDialog({ storeId, unavailableReason = "Выберите торговую точку в настройках, чтобы искать товары.", onClose }: { storeId?: string; unavailableReason?: string; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const productsRef = useRef<Promise<Product[]> | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ProductInfo[]>([]);
  const [selected, setSelected] = useState<ProductInfo | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function submitSearch() {
    void search(inputRef.current?.value ?? query);
  }

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

  return <Dialog ariaLabelledBy="product-info-title" className="product-info-dialog flex h-[min(780px,calc(100dvh-24px))] w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl app-surface shadow-2xl" onClose={onClose}>
    <header className="flex items-center justify-between gap-3 border-b app-border px-4 py-2.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700 sm:h-10 sm:w-10"><ProductInfoIcon /></span><h2 id="product-info-title" className="text-base sm:text-xl font-bold app-text">Информация о товаре</h2></div>
      <button aria-label="Закрыть" className="h-9 w-9 shrink-0 rounded-lg border app-border text-xl app-muted" onClick={onClose}>×</button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }}>
        <label htmlFor="product-info-query" className="mb-2 block text-sm font-semibold app-text">Штрихкод, код или наименование товара</label>
        <div className="flex items-start gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef} autoFocus autoComplete="off" id="product-info-query"
              aria-controls={resultsOpen ? "product-info-results" : undefined}
              className={`h-10 sm:h-11 w-full min-w-0 border app-border app-surface px-3 text-sm app-text outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${resultsOpen ? "rounded-t-lg" : "rounded-lg"}`}
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
              <ul id="product-info-results" aria-label="Результаты поиска товара" className="absolute inset-x-0 top-full z-20 max-h-64 overflow-y-auto overscroll-contain rounded-b-lg border border-t-0 app-border app-surface shadow-lg">
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
          <button aria-busy={busy} className="h-10 sm:h-11 min-w-20 rounded-lg bg-emerald-700 px-4 text-sm sm:px-5 font-bold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={!storeId || !query.trim() || busy} type="submit">{busy ? <LoadingDots label="Поиск товара" /> : "Найти"}</button>
        </div>
      </form>
      {!storeId ? <div className="mt-4 rounded-lg app-surface-muted p-4 text-sm app-text"><p>{unavailableReason}</p><button className="mt-3 font-semibold text-teal-600 underline" type="button" onClick={onClose}>Вернуться к выбору точки</button></div> : null}
      <div aria-live="polite" role="status">{busy ? <p className="sr-only">Поиск товара…</p> : message ? <p className="mt-4 rounded-lg app-surface-muted p-4 text-sm app-text">{message}</p> : null}</div>

      {selected ? <ProductCard key={selected.id} product={selected} /> : <ProductCardSkeleton />}
    </div>
  </Dialog>;
}

function CarouselControls({ index, count, label, onChange }: { index: number; count: number; label: string; onChange: (index: number) => void }) {
  if (count <= 1) return null;
  return <>
    <span className="absolute right-2.5 top-2.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-semibold text-white">{index + 1} / {count}</span>
    {[-1, 1].map((direction) => <button key={direction} type="button" aria-label={`${direction < 0 ? "Предыдущий" : "Следующий"} ${label}`} className={`product-carousel-arrow absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white ${direction < 0 ? "left-2" : "right-2"}`} onClick={() => onChange((index + direction + count) % count)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={direction < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} /></svg>
    </button>)}
  </>;
}

function ProductCard({ product }: { product: ProductInfo }) {
  const [mobileSection, setMobileSection] = useState<"stock" | "price" | "photos">("stock");
  const [imageIndex, setImageIndex] = useState(0);
  const [barcodeIndex, setBarcodeIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const photos = product.images.filter((image): image is string => Boolean(image));
  const priorityBarcode = findDisplayBarcode(product.barcodes);
  const barcodes = [...new Set([priorityBarcode, ...product.barcodes.map((item) => item.barcode)].filter((value): value is string => Boolean(value)))];
  const photo = photos[imageIndex];
  const barcode = barcodes[barcodeIndex];
  const receipt = product.receipts[0];
  const unit = product.isWeight ? "кг" : "шт.";
  const count = (value: number | undefined) => value === undefined ? "—" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
  const quantity = (value: number | undefined) => value === undefined ? "—" : product.isWeight ? formatNumber(value) : count(value);
  const receiptCount = (value: number | undefined) => {
    if (value === undefined) return "— чеков";
    const category = new Intl.PluralRules("ru-RU").select(Math.round(value));
    const word = category === "one" ? "чек" : category === "few" ? "чека" : "чеков";
    return `${count(value)} ${word}`;
  };
  const sales = [
    { label: "Вчера", sold: product.sold_yesterday_quantity, receipts: product.receipts_yesterday_quantity },
    { label: formatSalesWeek(), sold: product.sold_week_quantity, receipts: product.receipts_week_quantity }
  ];
  return <article className="mt-4 app-text">
    <p className="text-sm app-muted">Код: <span className="font-mono app-text">{product.code}</span></p>
    <h3 className="mt-2 flex items-center gap-3 text-lg font-bold leading-tight sm:text-2xl">{product.markingType !== "БезОсобенностейУчета" ? <span className="flex shrink-0 items-center"><HonestSignIcon /></span> : null}<span className="min-w-0 break-words">{product.name}</span></h3>
    <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl app-surface-muted p-1 md:hidden" role="group" aria-label="Разделы карточки">
      {([{ id: "stock", label: "Остаток" }, { id: "price", label: "Ценник" }, { id: "photos", label: "Фото" }] as const).map((section) => <button key={section.id} type="button" aria-pressed={mobileSection === section.id} aria-controls={`product-info-${section.id}`} className={`h-9 rounded-lg text-sm font-semibold ${mobileSection === section.id ? "app-surface app-text shadow-sm" : "app-muted"}`} onClick={() => setMobileSection(section.id)}>{section.label}</button>)}
    </div>
    <div className="mt-4 grid items-stretch gap-3 md:gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
      <section id="product-info-stock" className={`product-info-metrics min-w-0 rounded-2xl border p-4 lg:p-5 ${mobileSection === "stock" ? "" : "hidden md:block"}`} aria-label="Продажи и остаток">
        <h4 className="product-info-metrics-heading text-sm font-semibold uppercase tracking-wider">Продано</h4>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_max-content] gap-3">
          {sales.map(({ label, sold, receipts }) => <div key={label}>
            <p className="product-info-metrics-muted whitespace-nowrap text-xs leading-5 xl:text-sm">{label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5"><strong className="text-2xl tabular-nums">{quantity(sold)}</strong><span className="product-info-metrics-heading">{unit}</span></p>
            <p className="product-info-metrics-muted mt-1 text-sm">{receiptCount(receipts)}</p>
          </div>)}
        </div>
        <div className="product-info-metrics-divider mt-4 border-t pt-4">
          <h4 className="product-info-metrics-heading text-sm font-semibold uppercase tracking-wider">Остаток</h4>
          <p className="product-info-metrics-muted mt-3 text-sm">На складе</p>
          <p className="mt-1"><strong className="text-2xl tabular-nums">{quantity(product.stock)}</strong> <span className="product-info-metrics-heading">{unit}</span></p>
          <p className="product-info-metrics-muted mt-1 text-sm">Ориентировочно хватит на {count(product.stock_days)} дн.</p>
        </div>
      </section>
      <div id="product-info-price" className={`min-w-0 ${mobileSection === "price" ? "" : "hidden md:block"}`}><ProductPriceTag product={product} /></div>
      <div id="product-info-photos" className={`mx-auto w-full min-w-0 flex-col gap-3 md:gap-4 ${mobileSection === "photos" ? "flex" : "hidden md:flex"}`}>
        <div className="relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-2xl border app-border bg-white p-4">
          {photo && !failedImages.includes(photo) ? /* eslint-disable-next-line @next/next/no-img-element */
            <img key={photo} alt={product.name} className="h-full w-full object-contain" decoding="async" height={250} src={photo} width={250} onError={() => setFailedImages((failed) => [...failed, photo])} /> : <span className="text-sm text-slate-500">{photo ? "Фото недоступно" : "Нет фото"}</span>}
          <CarouselControls index={imageIndex} count={photos.length} label="снимок" onChange={setImageIndex} />
        </div>
        <div className="product-info-barcode relative flex min-h-28 md:flex-1 items-center justify-center overflow-hidden rounded-2xl border app-border bg-white px-3 py-4 text-black">
          {barcode ? getBarcodeFormat(barcode) ? <ProductBarcode value={barcode} /> : <span className="break-all px-10 font-mono">{barcode}</span> : <span className="text-sm text-slate-500">Нет штрихкода</span>}
          <CarouselControls index={barcodeIndex} count={barcodes.length} label="штрихкод" onChange={setBarcodeIndex} />
        </div>
      </div>
    </div>
    <section className="mt-6 flex min-w-0 items-start gap-3 text-sm" aria-labelledby="product-receipts-title">
      <svg className="mt-1 shrink-0 app-muted" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>
      <div className="min-w-0">
      <h4 id="product-receipts-title" className="app-muted">Последнее поступление</h4>
      <p className="mt-1 break-words font-semibold tabular-nums sm:text-base">
        {receipt ? <>{receipt.type} {receipt.number} от {formatReceiptDate(receipt.date)}, поставщик: {receipt.supplier}, поступило: {quantity(receipt.quantity)} {unit}.</> : "Нет данных о поступлении"}
      </p>
      </div>
    </section>
  </article>;
}

function ProductCardSkeleton() {
  return <div className="mt-5" role="status" aria-label="Ожидание данных товара">
    <div aria-hidden="true" className="product-info-skeleton">
      <div className="h-4 w-36 rounded product-info-skeleton-fill" />
      <div className="mt-3 h-8 w-4/5 rounded product-info-skeleton-fill" />
      <div className="mt-4 h-11 rounded-xl product-info-skeleton-fill md:hidden" />
      <div className="mt-4 grid items-stretch gap-3 md:gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border app-border p-4">
          <div className="h-4 w-24 rounded product-info-skeleton-fill" />
          <div className="mt-5 grid grid-cols-2 gap-6">{[0, 1].map((item) => <div key={item}><div className="h-4 w-20 rounded product-info-skeleton-fill" /><div className="mt-3 h-9 w-full rounded product-info-skeleton-fill" /><div className="mt-3 h-4 w-24 rounded product-info-skeleton-fill" /></div>)}</div>
          <div className="mt-6 border-t app-border pt-5"><div className="h-4 w-24 rounded product-info-skeleton-fill" /><div className="mt-4 h-9 w-36 rounded product-info-skeleton-fill" /><div className="mt-3 h-4 w-4/5 rounded product-info-skeleton-fill" /></div>
        </div>
        <div className="hidden rounded-2xl border app-border p-4 md:block"><div className="aspect-square rounded-xl product-info-skeleton-fill" /><div className="mt-4 h-10 rounded-lg product-info-skeleton-fill" /></div>
        <div className="hidden w-full md:block"><div className="aspect-square rounded-2xl product-info-skeleton-fill" /><div className="mt-4 h-28 rounded-2xl product-info-skeleton-fill" /></div>
      </div>
      <div className="mt-6 h-4 w-40 rounded product-info-skeleton-fill" /><div className="mt-3 h-5 w-4/5 rounded product-info-skeleton-fill" />
    </div>
  </div>;
}
