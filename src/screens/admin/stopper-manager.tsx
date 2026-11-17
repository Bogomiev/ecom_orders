"use client";
import { Fragment, useEffect, useState, type MouseEvent } from "react";
import { addManualPosition, createStopper, deleteStopper, loadStopperPositions, loadStoppers, saveStopper, setPositionsPeriod, setPositionsStopper } from "@/entities/stopper/api";
import { defaultWindow, filterPositions, promotedInStores, formatShortDate, formatStopperPrice, localDate, maxPriceStores, periodState, positionGroup, positionID, positionKey, sortPositions, stopperCounts, storageMode, type Stopper, type StopperInput, type StopperPosition, type StopperProduct, type StopperSort, type StopperTab } from "@/entities/stopper/model";
import { loadPickerStores, type PickStore } from "@/features/store-picker/store-picker";
import { RefreshButton } from "./admin-controls";
import { AddPositionDialog, DeleteStopperDialog, PeriodForm, Popover, StopperChip, StopperPicker } from "./stopper-popovers";

type Pop = { kind: "stopper"; id: string; anchor: DOMRect } | { kind: "period"; ids: string[]; anchor: DOMRect };
type Modal = { kind: "add" } | { kind: "delete"; stopper: Stopper } | null;
const hand = <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v2" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>;

export function StopperManager() {
 const today = localDate();
 const [initialWindow] = useState(() => defaultWindow(today));
 const [stores, setStores] = useState<PickStore[]>([]);
 const [columns, setColumns] = useState<string[]>([]);
 const [storesReady, setStoresReady] = useState(false);
 const [stoppers, setStoppers] = useState<Stopper[]>([]);
 const [items, setItems] = useState<StopperPosition[]>([]);
 const [period, setPeriod] = useState(initialWindow);
 const [tab, setTab] = useState<StopperTab>("nostop");
 const [sort, setSort] = useState<StopperSort>("stopper");
 const [query, setQuery] = useState("");
 const [selected, setSelected] = useState<Set<string>>(new Set());
 const [loading, setLoading] = useState(true);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const [modalError, setModalError] = useState("");
 const [version, setVersion] = useState(0);
 const [pop, setPop] = useState<Pop | null>(null);
 const [modal, setModal] = useState<Modal>(null);
 const [toast, setToast] = useState("");
 const invalidPeriod = Boolean(period.from && period.to && period.from > period.to) || !period.from || !period.to;
 const columnsKey = columns.join(",");

 useEffect(() => {
  const controller = new AbortController();
  loadPickerStores(controller.signal).then(data => {
   if (controller.signal.aborted) return;
   const sorted = [...data].sort((a, b) => a.code.localeCompare(b.code, "ru", { numeric: true }));
   setStores(sorted); setColumns(sorted.slice(0, 1).map(v => v.id));
  }).catch(e => { if (!controller.signal.aborted) setError((e as Error).message); }).finally(() => { if (!controller.signal.aborted) setStoresReady(true); });
  return () => controller.abort();
 }, []);
 useEffect(() => {
  if (!storesReady || invalidPeriod) return;
  let active = true;
  Promise.all([loadStoppers(), loadStopperPositions(period.from, period.to, columnsKey ? columnsKey.split(",") : [])])
   .then(([dictionary, positions]) => { if (active) { setStoppers(dictionary); setItems(positions.filter(promotedInStores)); } })
   .catch(e => { if (active) setError((e as Error).message); })
   .finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, [storesReady, invalidPeriod, period.from, period.to, columnsKey, version]);
 useEffect(() => {
  if (!toast) return;
  const timer = setTimeout(() => setToast(""), 2600);
  return () => clearTimeout(timer);
 }, [toast]);

 const refresh = () => { setLoading(true); setVersion(v => v + 1); };
 function changePeriod(next: { from: string; to: string }) { setPeriod(next); setSelected(new Set()); setLoading(Boolean(next.from && next.to && next.from <= next.to)); setError(""); }
 function changeColumns(next: string[]) { setColumns(next); setLoading(!invalidPeriod); }
 async function run(action: () => Promise<unknown>, message: string, keepPop = false) {
  setBusy(true); setError("");
  try { await action(); if (!keepPop) setPop(null); setToast(message); refresh(); return true; }
  catch (e) { setError((e as Error).message); return false; }
  finally { setBusy(false); }
 }
 const byID = new Map(items.map(v => [positionID(v), v]));
 const keysOf = (ids: string[]) => ids.map(id => byID.get(id)).filter((v): v is StopperPosition => Boolean(v)).map(positionKey);
 const stopperName = (id: number | null) => stoppers.find(v => v.id === id)?.name ?? "";
 function setStopper(ids: string[], stopperID: number | null) {
  void run(() => setPositionsStopper(keysOf(ids), stopperID), stopperID === null ? (ids.length > 1 ? `Стоппер снят у ${ids.length} поз.` : "Стоппер снят") : ids.length > 1 ? `«${stopperName(stopperID)}» установлен у ${ids.length} поз.` : `Стоппер «${stopperName(stopperID)}» установлен`).then(ok => { if (ok && ids.length > 1) setSelected(new Set()); });
 }
 function savePeriod(ids: string[], from: string, to: string | null) {
  void run(() => setPositionsPeriod(keysOf(ids), from, to), `Период ${formatShortDate(from)} – ${to ? formatShortDate(to) : "без срока"}${ids.length > 1 ? ` · ${ids.length} поз.` : ""}`).then(ok => { if (ok && ids.length > 1) setSelected(new Set()); });
 }
 // Dictionary changes keep the picker open so the new stopper can be chosen right away.
 function saveDictionary(id: number | null, input: StopperInput) {
  return run(() => id === null ? createStopper(input) : saveStopper(id, input), id === null ? `Стоппер «${input.name.trim()}» создан` : "Стоппер изменён", true);
 }
 async function addPosition(product: StopperProduct, stopperID: number) {
  setBusy(true); setModalError("");
  try { await addManualPosition(product.id, stopperID, today); setModal(null); setTab("stop"); setToast("Позиция добавлена"); refresh(); }
  catch (e) { setModalError((e as Error).message); } finally { setBusy(false); }
 }
 async function removeStopper(stopper: Stopper) {
  setBusy(true); setModalError("");
  try { await deleteStopper(stopper.id); setModal(null); setToast("Стоппер удалён"); refresh(); }
  catch (e) { setModalError((e as Error).message); } finally { setBusy(false); }
 }
 // A second click on the same control closes its popover.
 function openPop(e: MouseEvent<HTMLElement>, next: { kind: "stopper"; id: string } | { kind: "period"; ids: string[] }) {
  const anchor = e.currentTarget.getBoundingClientRect();
  const target = (v: typeof next) => `${v.kind}:${"id" in v ? v.id : v.ids.join(",")}`;
  setPop(current => current && target(current) === target(next) ? null : { ...next, anchor });
 }

 const counts = stopperCounts(items, today);
 const rows = sortPositions(filterPositions(items, tab, query), sort, stoppers);
 const selection = [...selected].filter(id => byID.has(id));
 const allSelected = rows.length > 0 && rows.every(v => selected.has(positionID(v)));
 const groupSizes = new Map<string, number>();
 for (const v of rows) groupSizes.set(positionGroup(v, sort), (groupSizes.get(positionGroup(v, sort)) ?? 0) + 1);
 const toggle = (id: string, on: boolean) => setSelected(current => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; });
 const columnCount = 5 + columns.length;
 const popItem = pop?.kind === "stopper" ? byID.get(pop.id) : undefined;
 const popPositions = pop && pop.kind !== "stopper" ? pop.ids.map(id => byID.get(id)).filter((v): v is StopperPosition => Boolean(v)) : [];
 const tiles: { value: StopperTab; label: string; count: number; note: string; warn?: boolean }[] = [
  { value: "nostop", label: "Без стоппера", count: counts.nostop, note: counts.fresh ? `из них новых за 2 дня: ${counts.fresh}` : "новых нет", warn: true },
  { value: "stop", label: "Со стоппером", count: counts.stop, note: "уходят в задание магазинам" },
  { value: "all", label: "Всего позиций", count: counts.all, note: `акционных: ${counts.promo}` },
  { value: "manual", label: "Добавлено вручную", count: counts.manual, note: "без акционной цены" }
 ];
 const groupStarts = new Set(rows.filter((v, i) => i === 0 || positionGroup(rows[i - 1], sort) !== positionGroup(v, sort)).map(positionID));

 return <section className="admin-panel stopper-panel">
  <div className="stopper-head"><h2>Стопперы</h2>
   <details className="stopper-help"><summary aria-label="Пояснение">?</summary><div>
    <p><b>Что здесь.</b> Акционные товары из 1С, у которых есть акционная цена хотя бы в одном из магазинов в колонках цен, и позиции, добавленные вручную. Добавьте колонку магазина, чтобы увидеть и его акции.</p>
    <p><b>Стоппер.</b> У позиции один стоппер. Нажмите на чип или «+ Стоппер» в строке, чтобы выбрать, сменить или снять его. Там же создаются, переименовываются и удаляются сами стопперы.</p>
    <p><b>Задание магазинам.</b> Позиции со стоппером уходят магазинам в задание «Стопперы»: магазин проверяет стопперы на полке и снимает истёкшие за последние 2 недели.</p>
    <p><b>Цены.</b> Сверху — регулярная, снизу — акционная. Без акции регулярная пишется чёрным на месте акционной. Магазин выбирается в шапке колонки, «+ Магазин» добавляет колонку для сравнения.</p>
    <p><b>Удалить позицию нельзя</b> — её закрывают датой: нажмите на период и поставьте «по» или «Закрыть сегодня». Для нескольких — галочки и «Период…».</p>
    <p><b>Значок ладони</b> — позиция добавлена вручную, без акционной цены.</p>
    <p><b>Период действия.</b> С какого по какое число стоппер стоит в магазине; по умолчанию — период акции из 1С. Бирюзовые даты — период ещё не начался, красные — истёк. Пустое «по» — без срока.</p>
    <p><b>Фильтр «Период с … по …»</b> показывает позиции, чей период пересекается с окном. По умолчанию — неделя до и неделя после сегодняшнего дня.</p>
    <p><b>Хранение</b> — признак терморежима товара из 1С: «Терморежим» (холодильник или морозильный ларь) или «Без терморежима» (стеллаж). Здесь он не меняется.</p>
    <p><b>Плашки сверху</b> работают как фильтр списка и считают позиции в этом окне.</p>
   </div></details>
  </div>
  <div className="stopper-tiles">{tiles.map(v => <button key={v.value} type="button" className={`stopper-tile${v.warn ? " warn" : ""}${tab === v.value ? " on" : ""}`} aria-pressed={tab === v.value} onClick={() => setTab(v.value)}><span>{v.label}</span><strong>{v.count}</strong><small>{v.note}</small></button>)}</div>
  {selection.length > 0 && <div className="stopper-selbar"><b>Выбрано: {selection.length}</b><span>Стоппер:</span>
   {stoppers.map(v => <button key={v.id} type="button" className="stopper-selbar-chip" disabled={busy} title={`Установить «${v.name}»`} onClick={() => setStopper(selection, v.id)}><StopperChip stopper={v} /></button>)}
   <button type="button" disabled={busy} onClick={() => setStopper(selection, null)}>Снять</button>
   <button type="button" disabled={busy} onClick={e => openPop(e, { kind: "period", ids: selection })}>Период…</button>
   <span className="stopper-spacer" /><button type="button" onClick={() => setSelected(new Set())}>Снять выделение</button></div>}
  {error && <p role="alert" className="admin-error">{error}</p>}
  <div className="stopper-card">
   <div className="stopper-toolbar">
    <input type="search" className="stopper-search" placeholder="Поиск по названию или коду" aria-label="Поиск по названию или коду" value={query} onChange={e => setQuery(e.target.value)} />
    <span className="stopper-window" title="Показываются позиции, период действия которых пересекается с этим окном"><span>Период</span><i>с</i><input type="date" aria-label="Окно видимости с" value={period.from} onChange={e => changePeriod({ ...period, from: e.target.value })} /><i>по</i><input type="date" aria-label="Окно видимости по" value={period.to} onChange={e => changePeriod({ ...period, to: e.target.value })} />
     {(period.from !== initialWindow.from || period.to !== initialWindow.to) && <button type="button" className="stopper-ghost" title="Вернуть ± неделю от сегодня" onClick={() => changePeriod(initialWindow)}>± неделя</button>}</span>
    <span className="stopper-sort"><span>Сортировка</span><span className="stopper-seg" role="group" aria-label="Сортировка"><button type="button" aria-pressed={sort === "stopper"} onClick={() => setSort("stopper")}>по стопперам</button><button type="button" aria-pressed={sort === "storage"} onClick={() => setSort("storage")}>по режимам хранения</button></span></span>
    <span className="stopper-spacer" />
    <RefreshButton disabled={loading || invalidPeriod} onClick={refresh} />
    <button type="button" className="primary" disabled={busy || !stoppers.length} onClick={() => { setModalError(""); setModal({ kind: "add" }); }}>+ Добавить позицию</button>
   </div>
   {invalidPeriod && <p role="alert" className="admin-error">Укажите период: дата «с» не может быть позже даты «по».</p>}
   <div className="files-table-wrap"><table className="stopper-table">
    <thead><tr>
     <th className="stopper-check-cell"><input type="checkbox" aria-label="Выбрать все" checked={allSelected} disabled={!rows.length} onChange={e => setSelected(current => { const next = new Set(current); for (const v of rows) { if (e.target.checked) next.add(positionID(v)); else next.delete(positionID(v)); } return next; })} /></th>
     <th>Товар · стоппер</th><th>Хранение</th><th className="stopper-hand-cell" title="Добавлено вручную"><span className="stopper-hand">{hand}</span></th><th>Период действия</th>
     {columns.map((storeID, index) => <th key={storeID} className="stopper-price-head">
      <div className="stopper-price-store"><select aria-label="Магазин для цен" value={storeID} onChange={e => changeColumns(columns.map((v, i) => i === index ? e.target.value : v))}>{stores.map(s => <option key={s.id} value={s.id} disabled={s.id !== storeID && columns.includes(s.id)}>{s.code} — {s.name}</option>)}</select>
       {columns.length > 1 && <button type="button" className="stopper-x" title="Убрать колонку" aria-label="Убрать колонку" onClick={() => changeColumns(columns.filter((_, i) => i !== index))}>✕</button>}</div>
      <div className="stopper-price-sub">{index === columns.length - 1 && columns.length < Math.min(maxPriceStores, stores.length) && <select className="stopper-add-store" aria-label="Добавить магазин" title="Добавить колонку цен другого магазина" value="" onChange={e => { if (e.target.value) changeColumns([...columns, e.target.value]); }}><option value="" disabled hidden>+ Магазин</option>{stores.filter(s => !columns.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select>}<span>рег. / акц.</span></div>
     </th>)}
    </tr></thead>
    <tbody>{rows.map(v => {
     const id = positionID(v), group = positionGroup(v, sort), stopper = stoppers.find(s => s.id === v.stopper_id), mode = storageMode(v.thermal_mode), state = periodState(v, today);
     return <Fragment key={id}>{groupStarts.has(id) && <tr className="stopper-group"><td colSpan={columnCount}>{sort === "stopper" ? stopper ? <StopperChip stopper={stopper} /> : <span className="stopper-tag warn">Без стоппера</span> : <b>{mode.icon} {mode.label}</b>}<span className="stopper-group-count">{groupSizes.get(group)}</span></td></tr>}
      <tr className={`${selected.has(id) ? "selected" : ""}${stopper ? "" : " no-stopper"}`}>
      <td className="stopper-check-cell"><input type="checkbox" aria-label={`Выбрать ${v.name}`} checked={selected.has(id)} onChange={e => toggle(id, e.target.checked)} /></td>
      <td className="stopper-name"><b>{v.name || v.product_id}</b><div className="stopper-name-sub">
       {stopper ? <button type="button" className="stopper-pick" title="Сменить стоппер" disabled={busy} onClick={e => openPop(e, { kind: "stopper", id })}><StopperChip stopper={stopper}><span className="stopper-chevron">▼</span></StopperChip></button> : <button type="button" className="stopper-add" disabled={busy} onClick={e => openPop(e, { kind: "stopper", id })}>+ Стоппер</button>}
       <small>{v.code}{v.stores > 0 && <span title="Документ акции 1С действует в этих магазинах (по акционному типу цен)"> · акция в {v.stores} маг.</span>}</small></div></td>
      <td><span className="stopper-mode" title={mode.place}>{mode.icon} {mode.label}</span></td>
      <td className="stopper-hand-cell">{v.manual && <span className="stopper-hand manual" title="Добавлено вручную, без акционной цены" aria-label="Добавлено вручную">{hand}</span>}</td>
      <td><button type="button" className={`stopper-period ${state}`} disabled={busy} title={`${state === "plan" ? "Запланирован · " : state === "done" ? "Истёк · " : ""}Изменить период`} onClick={e => openPop(e, { kind: "period", ids: [id] })}><span><i>с</i>{formatShortDate(v.from, today)}</span><span><i>по</i>{v.to ? formatShortDate(v.to, today) : <em>без срока</em>}</span></button></td>
      {columns.map(storeID => { const price = v.prices.find(p => p.store_id === storeID); return <td key={storeID} className="stopper-price">{price?.promo_price ? <><s>{formatStopperPrice(price.price)}</s><strong>{formatStopperPrice(price.promo_price)}</strong></> : <><span /><strong className="regular">{formatStopperPrice(price?.price ?? null)}</strong></>}</td>; })}
     </tr></Fragment>;
    })}</tbody>
   </table>
   {loading ? <p role="status" className="stopper-empty">Загрузка…</p> : !rows.length && !invalidPeriod && <p className="stopper-empty">{tab === "nostop" && !query ? "Все позиции со стопперами ✓" : "Ничего не найдено"}</p>}</div>
  </div>
  {pop?.kind === "stopper" && popItem && <Popover anchor={pop.anchor} label="Выбор стоппера" onClose={() => setPop(null)}><StopperPicker stoppers={stoppers} current={popItem.stopper_id} busy={busy} onPick={stopperID => setStopper([pop.id], stopperID)} onSave={saveDictionary} onDelete={stopper => { setPop(null); setModalError(""); setModal({ kind: "delete", stopper }); }} /></Popover>}
  {pop?.kind === "period" && popPositions.length > 0 && <Popover anchor={pop.anchor} wide label="Период действия" onClose={() => setPop(null)}><PeriodForm count={popPositions.length} from={popPositions[0].from} to={popPositions[0].to ?? ""} today={today} busy={busy} onSave={(from, to) => savePeriod(pop.ids, from, to)} onCancel={() => setPop(null)} /></Popover>}
  {modal?.kind === "add" && <AddPositionDialog stoppers={stoppers} busy={busy} error={modalError} onAdd={addPosition} onClose={() => setModal(null)} />}
  {modal?.kind === "delete" && <DeleteStopperDialog stopper={modal.stopper} busy={busy} error={modalError} onYes={() => void removeStopper(modal.stopper)} onClose={() => setModal(null)} />}
  {toast && <div className="stopper-toast" role="status">{toast}</div>}
 </section>;
}
