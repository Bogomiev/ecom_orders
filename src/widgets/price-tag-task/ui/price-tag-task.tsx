"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/shared/ui/dialog";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { formatStopperPrice } from "@/entities/stopper/model";
import { addPriceTag, deletePriceTag, loadPriceTagTask, markPriceTagsPrinted, savePriceTag, searchPriceTagProducts } from "../api";
import { byPrintStatus, cardName, expandTags, formatMoment, hasPromo, maxQuantity, printable, sheets, sourceLabels, summary, tagPeriod, tagTypeLabels, unitLabels, unitPrice, type PrintFilter, type PriceTagItem, type PriceTagProduct, type PriceTagTask, type PriceTagUnit } from "../model/price-tag-task";
import { PriceTagSheet, priceTagSheetCss, printPriceTagSheet } from "./price-tag-sheet";
import "./price-tag-task.css";

const printerIcon = <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>;
const searchIcon = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
const today = () => new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Vladivostok" }).format(new Date());

// The price printed on the tag for its unit (chosen next to it), next to the tag type: the price, and for a
// discount or a card price the promotional price with the regular one under it.
function PriceBox({ item }: { item: PriceTagItem }) {
 if (!printable(item)) {
  const text = Number(item.price ?? 0) > 0 ? "Акции сейчас нет — выберите стандартный ценник" : "Нет цены в 1С — ценник не напечатать";
  return <span className="price-tag-task-price warn" title={text}>{Number(item.price ?? 0) > 0 ? "Нет акции" : "Нет цены"}</span>;
 }
 const price = (value: string | null) => formatStopperPrice(String(unitPrice(Number(value ?? 0), item.unit)));
 if (item.tag_type === "promo") return <span className="price-tag-task-price promo"><b>{price(item.promo_price)}</b><s>{price(item.price)}</s></span>;
 if (item.tag_type === "card") return <span className="price-tag-task-price promo" title={`С картой «${cardName}» — без карты ${price(item.price)}`}><b>{price(item.promo_price)}</b><small>{price(item.price)}</small></span>;
 return <span className="price-tag-task-price"><b>{price(item.price)}</b></span>;
}

const filters: { id: PrintFilter; label: string }[] = [{ id: "pending", label: "Не напечатаны" }, { id: "printed", label: "Напечатаны" }, { id: "all", label: "Все" }];

// «Печать ценников» is a standing task: RMS puts products whose price tag changed after the last print into
// it (and products added here or from the product card) and closes it when nothing is left to print.
// Printing opens a preview of the A4 sheets (18 tags of 60 × 47 mm edge to edge); after printing the store
// confirms, and the positions are marked printed.
export function PriceTagTaskView({ task_id, onClose }: { task_id: number; onClose: () => void }) {
 const [task, setTask] = useState<PriceTagTask | null>(null);
 const [error, setError] = useState("");
 const [version, setVersion] = useState(0);
 const [selected, setSelected] = useState<Set<number> | null>(null);
 const [query, setQuery] = useState("");
 const [found, setFound] = useState<{ query: string; items: PriceTagProduct[]; error: string }>({ query: "", items: [], error: "" });
 const [busy, setBusy] = useState(false);
 const [preview, setPreview] = useState<{ items: PriceTagItem[]; date: string } | null>(null);
 const [printing, setPrinting] = useState(false);
 // The positions to mark printed: after printing, or by hand without printing (manual).
 const [asking, setAsking] = useState<{ items: PriceTagItem[]; manual: boolean } | null>(null);
 const [filter, setFilter] = useState<PrintFilter>("pending");
 const sheetRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
  let active = true;
  loadPriceTagTask(task_id).then(data => { if (active) { setTask(data); setError(""); } }).catch(e => { if (active) setError((e as Error).message); });
  return () => { active = false; };
 }, [task_id, version]);

 const search = query.trim();
 useEffect(() => {
  if (search.length < 2) return;
  let active = true;
  const timer = setTimeout(() => {
   searchPriceTagProducts(task_id, search).then(items => { if (active) setFound({ query: search, items, error: "" }); }).catch(e => { if (active) setFound({ query: search, items: [], error: (e as Error).message }); });
  }, 300);
  return () => { active = false; clearTimeout(timer); };
 }, [task_id, search]);

 const items = useMemo(() => task?.items ?? [], [task]);
 // Until the store changes the selection, every position still to print is selected.
 const chosen = useMemo(() => selected ?? new Set(items.filter(v => v.pending && printable(v)).map(v => v.id)), [selected, items]);
 const counts = summary(items, chosen);
 const open = task?.status === "new" || task?.status === "in_progress";
 const shown = byPrintStatus(items, filter);
 const shownPrintable = shown.filter(printable);
 const results = search.length >= 2 && found.query === search ? found : null;
 // Chosen positions not printed yet, to mark printed without printing.
 const toMark = items.filter(v => v.pending && chosen.has(v.id));

 function reload() { setVersion(v => v + 1); }
 function patch(id: number, change: Partial<PriceTagItem>) { setTask(t => t && { ...t, items: t.items.map(v => v.id === id ? { ...v, ...change } : v) }); }
 function toggle(id: number, on: boolean) { const next = new Set(chosen); if (on) next.add(id); else next.delete(id); setSelected(next); }

 async function change(item: PriceTagItem, change: Partial<Pick<PriceTagItem, "tag_type" | "quantity" | "unit">>) {
  const before = { tag_type: item.tag_type, quantity: item.quantity, unit: item.unit };
  patch(item.id, change);
  try { await savePriceTag(task_id, { id: item.id, ...before, ...change }); setError(""); }
  catch (e) { patch(item.id, before); setError((e as Error).message); }
 }
 async function add(product: PriceTagProduct) {
  setBusy(true);
  try { await addPriceTag(task_id, product.id); setQuery(""); setError(""); reload(); }
  catch (e) { setError((e as Error).message); }
  finally { setBusy(false); inputRef.current?.focus(); }
 }
 // Enter adds the only match or the product whose barcode or code was scanned.
 function addFromInput() {
  if (!results || results.error) return;
  const exact = results.items.find(v => v.barcode === search || v.code.toLowerCase() === search.toLowerCase());
  const product = exact ?? (results.items.length === 1 ? results.items[0] : null);
  if (product) void add(product);
 }
 async function remove(item: PriceTagItem) {
  setBusy(true);
  try { await deletePriceTag(task_id, item.id); setError(""); reload(); }
  catch (e) { setError((e as Error).message); }
  finally { setBusy(false); }
 }
 function print(list: PriceTagItem[]) {
  const ready = list.filter(printable);
  if (ready.length) setPreview({ items: ready, date: today() });
 }
 // The preview sheet, barcodes included, is copied to the print frame as it is.
 function printPreview() {
  const sheet = sheetRef.current?.querySelector<HTMLElement>(".pt-sheet");
  if (!preview || !sheet) return;
  const printed = preview.items;
  setPrinting(true);
  printPriceTagSheet(sheet, ok => {
   setPrinting(false);
   if (ok) { setPreview(null); setAsking({ items: printed, manual: false }); } else setError("Не удалось открыть печать ценников");
  });
 }
 async function confirmPrinted(list: PriceTagItem[]) {
  setBusy(true);
  try {
   await markPriceTagsPrinted(task_id, list.map(v => v.id));
   setSelected(null); setAsking(null); setError(""); reload();
  } catch (e) { setError((e as Error).message); }
  finally { setBusy(false); }
 }

 return <Dialog ariaLabelledBy="price-tag-task-title" onClose={() => { if (!preview && !busy) onClose(); }} closeOnBackdrop={false} className="price-tag-task">
  <header className="price-tag-task-head">
   <span className="price-tag-task-icon">{printerIcon}</span>
   <div className="price-tag-task-title"><h2 id="price-tag-task-title">Печать ценников</h2><small>{task ? `${task.store_name} · отметьте позиции для печати` : "Отметьте позиции для печати"}</small></div>
   <span className="price-tag-task-count" title="Не напечатано">{items.length - counts.printed}</span>
   <button type="button" className="price-tag-task-close" aria-label="Закрыть" onClick={onClose}>×</button>
  </header>
  {task && open && <div className="price-tag-task-scan">
   <label className="price-tag-task-search">{searchIcon}<input ref={inputRef} type="search" placeholder="Поиск товара или сканирование штрих-кода…" aria-label="Найти товар для ценника" value={query} disabled={busy}
    onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFromInput(); } }} /></label>
   {search.length >= 2 && <div className="price-tag-task-found" role="listbox" aria-label="Найденные товары">
    {!results ? <p role="status"><LoadingDots /></p> : results.error ? <p role="alert">{results.error}</p> : !results.items.length ? <p>Не найдено</p>
     : results.items.map(v => <button key={v.id} type="button" role="option" aria-selected={false} disabled={busy} onClick={() => void add(v)}><span>{v.name}<small>{v.code}{v.barcode && ` · ${v.barcode}`}</small></span><em>{v.added ? "+1 ценник" : "Добавить"}</em></button>)}
   </div>}
  </div>}
  <div className="price-tag-task-body">
   {error && <p role="alert" className="price-tag-task-error">{error}{!task && <button type="button" onClick={reload}>Повторить</button>}</p>}
   {!task && !error && <p role="status" className="price-tag-task-empty"><LoadingDots /></p>}
   {task && !open && <p className="price-tag-task-note">{task.status === "completed" ? "Все ценники напечатаны — задание закрыто." : "Задание отменено."} Новые ценники появятся в новом задании.</p>}
   {task && items.length > 0 && <div className="price-tag-task-filterbar">
    <div className="price-tag-task-filter" role="group" aria-label="Статус печати">
     {filters.map(f => { const n = byPrintStatus(items, f.id).length; return <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label} <span>{n}</span></button>; })}
    </div>
    <div className="price-tag-task-selection">
     {/* With nothing chosen the button selects every printable position of the current filter. */}
     {counts.selected ? <button type="button" disabled={busy} onClick={() => setSelected(new Set())}>Снять все</button>
      : <button type="button" disabled={!shownPrintable.length || busy} onClick={() => setSelected(new Set(shownPrintable.map(v => v.id)))}>Выбрать все</button>}
     {open && <button type="button" className="mark" disabled={!toMark.length || busy} title="Ценники напечатаны в другой системе — отметить выбранные без печати" onClick={() => setAsking({ items: toMark, manual: true })}>✓ Отметить напечатанными{toMark.length ? ` (${toMark.length})` : ""}</button>}
    </div>
   </div>}
   {task && shown.length > 0 && <div className="price-tag-task-list">
    <div className="price-tag-task-row head">
     <span className="check"><input type="checkbox" aria-label="Выбрать все" checked={shownPrintable.length > 0 && shownPrintable.every(v => chosen.has(v.id))} onChange={e => { const next = new Set(chosen); for (const v of shownPrintable) { if (e.target.checked) next.add(v.id); else next.delete(v.id); } setSelected(next); }} /></span>
     <span>Товар</span><span>Ценник</span><span className="r">Кол-во</span>
    </div>
    {shown.map(item => <div key={item.id} className={`price-tag-task-row${chosen.has(item.id) ? "" : " off"}${item.pending ? "" : " printed"}`}>
     <span className="check"><input type="checkbox" aria-label={`Печатать ${item.name}`} disabled={!printable(item)} checked={chosen.has(item.id)} onChange={e => toggle(item.id, e.target.checked)} /></span>
     <div className="price-tag-task-product">
      <div className="name">{item.name}</div>
      <div className="meta">{item.barcode ? `Штрих-код ${item.barcode}` : "Без штрих-кода"} · {item.code}</div>
      <div className="meta"><span className={`price-tag-task-status${item.pending ? " pending" : ""}`}>{item.pending ? "Не напечатан" : `Напечатан ${formatMoment(item.printed_at)}`}</span>{item.pending && open && <button type="button" className="price-tag-task-mark" disabled={busy} title="Ценник напечатан в другой системе — отметить без печати" onClick={() => setAsking({ items: [item], manual: true })}>✓ Отметить напечатанным</button>}<span className={`price-tag-task-source ${item.source}`}>{sourceLabels[item.source]}</span>{tagPeriod(item) && <span>{tagPeriod(item)}</span>}</div>
      <div className="meta"><span>Задание для печати {formatMoment(item.actual_at)}</span></div>
      <div className="meta"><span>{item.last_printed_at ? `Последняя печать ${formatMoment(item.last_printed_at)}` : "Ещё не печатался"}</span></div>
     </div>
     <div className="price-tag-task-tag">
      <div className="controls">
       <select className={`price-tag-task-type${item.tag_type === "promo" ? " promo" : ""}`} aria-label={`Ценник: ${item.name}`} value={item.tag_type} disabled={!open}
        onChange={e => void change(item, { tag_type: e.target.value as PriceTagItem["tag_type"] })}>
        <option value="regular">{tagTypeLabels.regular}</option>
        <option value="promo" disabled={!hasPromo(item)}>{tagTypeLabels.promo}</option>
        <option value="card" disabled={!hasPromo(item)}>{tagTypeLabels.card}</option>
       </select>
       {item.is_weight ? <select className="price-tag-task-unit" aria-label={`Единица измерения: ${item.name}`} value={item.unit} disabled={!open} onChange={e => void change(item, { unit: e.target.value as PriceTagUnit })}>
        <option value="kg">{unitLabels.kg}</option>
        <option value="100g">{unitLabels["100g"]}</option>
       </select> : <span className="price-tag-task-unit only" title="Единица измерения">{unitLabels.pc}</span>}
       <PriceBox item={item} />
      </div>
     </div>
     <div className="price-tag-task-qty">
      <button type="button" aria-label={`Меньше ценников: ${item.name}`} disabled={!open || item.quantity <= 1} onClick={() => void change(item, { quantity: item.quantity - 1 })}>−</button>
      <span>{item.quantity}</span>
      <button type="button" aria-label={`Больше ценников: ${item.name}`} disabled={!open || item.quantity >= maxQuantity} onClick={() => void change(item, { quantity: item.quantity + 1 })}>+</button>
      {item.source === "manual" && !item.printed_at && open && <button type="button" className="remove" aria-label={`Убрать ${item.name}`} title="Убрать из задания" disabled={busy} onClick={() => void remove(item)}>×</button>}
     </div>
    </div>)}
   </div>}
   {task && open && !items.length && <p className="price-tag-task-empty">Ценников для печати нет. Найдите товар или отсканируйте штрих-код, чтобы добавить его.</p>}
   {task && items.length > 0 && !shown.length && <p className="price-tag-task-empty">{filter === "pending" ? "Все ценники напечатаны." : "Напечатанных ценников пока нет."}</p>}
  </div>
  <footer className="price-tag-task-foot">
   <span>Выбрано {counts.selected} из {counts.total} · {counts.tags} ценн. · напечатано {counts.printed} из {counts.total}</span>
   <button type="button" disabled={!task || !shownPrintable.length || busy} onClick={() => print(shownPrintable)}>Печать всех{filter === "pending" ? " ненапечатанных" : filter === "printed" ? " напечатанных" : ""}</button>
   <button type="button" className="primary" disabled={!counts.selected || busy} onClick={() => print(items.filter(v => chosen.has(v.id)))}>{printerIcon}Печать выбранных{counts.tags ? ` (${counts.tags})` : ""}</button>
  </footer>
  {preview && (() => {
   const tags = expandTags(preview.items).length, pages = sheets(expandTags(preview.items)).length;
   return <Dialog ariaLabelledBy="price-tag-preview-title" onClose={() => { if (!printing) setPreview(null); }} className="price-tag-preview">
    <header className="price-tag-task-head">
     <span className="price-tag-task-icon">{printerIcon}</span>
     <div className="price-tag-task-title"><h2 id="price-tag-preview-title">Предпросмотр печати</h2><small>{pages} {pages === 1 ? "лист" : pages < 5 ? "листа" : "листов"} A4 · {tags} ценн. 60×47 мм · печатайте в масштабе 100%</small></div>
     <button type="button" className="price-tag-preview-print" disabled={printing} onClick={printPreview}>{printerIcon}Печать</button>
     <button type="button" className="price-tag-task-close" aria-label="Закрыть предпросмотр" disabled={printing} onClick={() => setPreview(null)}>×</button>
    </header>
    <div className="price-tag-preview-body">
     <style>{priceTagSheetCss}</style>
     <div className="price-tag-preview-pages" ref={sheetRef}><PriceTagSheet items={preview.items} date={preview.date} /></div>
    </div>
   </Dialog>;
  })()}
  {asking && <Dialog ariaLabel={asking.manual ? "Отметить напечатанным?" : "Ценники напечатались?"} onClose={() => { if (!busy) setAsking(null); }} className="price-tag-task-confirm">
   <p>{asking.manual ? asking.items.length === 1 ? `Отметить «${asking.items[0].name}» напечатанным без печати?` : `Отметить ${asking.items.length} поз. напечатанными без печати?` : "Ценники напечатались?"}</p>
   <small>{asking.manual ? `Например, если ${asking.items.length === 1 ? "ценник уже напечатан" : "ценники уже напечатаны"} в другой системе: ${asking.items.length === 1 ? "позиция перейдёт" : "позиции перейдут"} в «Напечатаны».` : `${asking.items.reduce((sum, v) => sum + v.quantity, 0)} ценн. по ${asking.items.length} поз. будут отмечены напечатанными.`}</small>
   <div><button type="button" className="primary" disabled={busy} onClick={() => void confirmPrinted(asking.items)}>Да{busy && <LoadingDots />}</button><button type="button" disabled={busy} onClick={() => setAsking(null)}>Нет</button></div>
  </Dialog>}
 </Dialog>;
}
