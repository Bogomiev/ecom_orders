"use client";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { searchStopperProducts } from "@/entities/stopper/api";
import { formatShortDate, maxStopperNameLength, stopperColors, stopperNameError, stopperTextColor, type Stopper, type StopperInput, type StopperProduct } from "@/entities/stopper/model";
import { AdminDialog as Dialog } from "./admin-controls";

export function StopperChip({ stopper, children }: { stopper: Pick<Stopper, "name" | "color">; children?: ReactNode }) {
 return <span className="stopper-chip" style={{ background: stopper.color, color: stopperTextColor(stopper.color) }}>{stopper.name || "Стоппер"}{children}</span>;
}

// Popover is anchored to the control that opened it and closes on outside click, Escape, scroll and resize.
export function Popover({ anchor, wide, label, onClose, children }: { anchor: DOMRect; wide?: boolean; label: string; onClose: () => void; children: ReactNode }) {
 const ref = useRef<HTMLDivElement>(null);
 const close = useRef(onClose);
 useLayoutEffect(() => { close.current = onClose; });
 useLayoutEffect(() => {
  const el = ref.current;
  if (!el) return;
  const height = el.offsetHeight, width = el.offsetWidth;
  const top = anchor.bottom + 6 + height > innerHeight - 8 ? Math.max(8, anchor.top - height - 6) : anchor.bottom + 6;
  el.style.top = `${top}px`;
  el.style.left = `${Math.max(8, Math.min(anchor.left, document.documentElement.clientWidth - width - 12))}px`;
  (el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>("button, input"))?.focus();
 }, [anchor]);
 useEffect(() => {
  const outside = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close.current(); };
  const key = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
  const scroll = (e: Event) => { if (!ref.current?.contains(e.target as Node)) close.current(); };
  const resize = () => close.current();
  document.addEventListener("mousedown", outside);
  document.addEventListener("keydown", key);
  window.addEventListener("scroll", scroll, true);
  window.addEventListener("resize", resize);
  return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", key); window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", resize); };
 }, []);
 return <div ref={ref} className={`stopper-pop${wide ? " wide" : ""}`} role="dialog" aria-label={label}>{children}</div>;
}

type Editing = { id: number | null; name: string; color: string; error: string };
export function StopperPicker({ stoppers, current, busy, onPick, onSave, onDelete }: { stoppers: Stopper[]; current: number | null; busy: boolean; onPick: (id: number | null) => void; onSave: (id: number | null, input: StopperInput) => Promise<boolean>; onDelete: (stopper: Stopper) => void }) {
 const [editing, setEditing] = useState<Editing | null>(null);
 if (editing) {
  const stopper = stoppers.find(v => v.id === editing.id);
  async function submit(e: FormEvent) {
   e.preventDefault();
   if (!editing) return;
   const error = stopperNameError(editing.name, stoppers, editing.id);
   if (error) { setEditing({ ...editing, error }); return; }
   if (await onSave(editing.id, { name: editing.name, color: editing.color })) setEditing(null);
  }
  return <><div className="stopper-pop-title">{stopper ? "Изменить стоппер" : "Новый стоппер"}</div>
   <form className="stopper-pop-form" onSubmit={submit}>
    <label>Наименование<input autoFocus value={editing.name} maxLength={maxStopperNameLength} placeholder="Например, «Сезон»" onChange={e => setEditing({ ...editing, name: e.target.value, error: "" })} /></label>
    <div><div className="stopper-pop-caption">Цвет</div>
     <div className="stopper-swatches">{stopperColors.map(color => <button key={color} type="button" className={editing.color === color ? "on" : ""} style={{ background: color }} aria-label={`Цвет ${color}`} aria-pressed={editing.color === color} onClick={() => setEditing({ ...editing, color })} />)}</div></div>
    <div className="stopper-preview">Как будет выглядеть: <StopperChip stopper={{ name: editing.name.trim(), color: editing.color }} /></div>
    {editing.error && <p role="alert" className="stopper-pop-error">{editing.error}</p>}
    <div className="stopper-pop-row">
     {stopper && <button type="button" className="danger" disabled={busy} title={stopper.positions ? `Установлен у ${stopper.positions} поз.` : undefined} onClick={() => onDelete(stopper)}>Удалить</button>}
     <span className="stopper-spacer" />
     <button type="button" disabled={busy} onClick={() => setEditing(null)}>Назад</button>
     <button type="submit" className="primary" disabled={busy}>{stopper ? "Сохранить" : "Создать"}</button>
    </div>
   </form></>;
 }
 return <><div className="stopper-pop-title">Стоппер для товара</div>
  {stoppers.map(v => <div key={v.id} className={`stopper-option${current === v.id ? " on" : ""}`}>
   <button type="button" className="stopper-option-pick" disabled={busy} data-autofocus={current === v.id || undefined} onClick={() => onPick(v.id)}><StopperChip stopper={v} />{current === v.id ? <span className="stopper-check">✓</span> : <span className="stopper-count">{v.positions}</span>}</button>
   <button type="button" className="stopper-option-edit" disabled={busy} title="Изменить стоппер" aria-label={`Изменить ${v.name}`} onClick={() => setEditing({ id: v.id, name: v.name, color: v.color, error: "" })}>✎</button>
  </div>)}
  <div className="stopper-pop-divider" />
  {current !== null && <button type="button" className="stopper-pop-link muted" disabled={busy} onClick={() => onPick(null)}>Снять стоппер</button>}
  <button type="button" className="stopper-pop-link" disabled={busy} onClick={() => setEditing({ id: null, name: "", color: stopperColors[5], error: "" })}>+ Новый стоппер</button></>;
}

export function PeriodForm({ count, from, to, today, busy, onSave, onCancel }: { count: number; from: string; to: string; today: string; busy: boolean; onSave: (from: string, to: string | null) => void; onCancel: () => void }) {
 const [value, setValue] = useState({ from, to, error: "" });
 function submit(e: FormEvent) {
  e.preventDefault();
  if (!value.from) { setValue({ ...value, error: "Укажите дату «с»." }); return; }
  if (value.to && value.to < value.from) { setValue({ ...value, error: "Дата «по» раньше даты «с»." }); return; }
  onSave(value.from, value.to || null);
 }
 return <><div className="stopper-pop-title">Период действия{count > 1 && ` · ${count} поз.`}</div>
  <form className="stopper-pop-form" onSubmit={submit}>
   <div className="stopper-pop-row"><label>С<input data-autofocus type="date" value={value.from} onChange={e => setValue({ ...value, from: e.target.value, error: "" })} /></label><label>По<input type="date" value={value.to} onChange={e => setValue({ ...value, to: e.target.value, error: "" })} /></label></div>
   <small>Пустое «по» — без срока. До даты «с» магазины стоппер не увидят, после даты «по» он уходит из задания.</small>
   {value.error && <p role="alert" className="stopper-pop-error">{value.error}</p>}
   <div className="stopper-pop-row">
    <button type="button" disabled={busy} title={`Поставить «по» = ${formatShortDate(today)}: стоппер уходит из задания после сегодняшнего дня`} onClick={() => onSave(value.from && value.from <= today ? value.from : today, today)}>Закрыть сегодня</button>
    <span className="stopper-spacer" />
    <button type="button" disabled={busy} onClick={onCancel}>Отмена</button>
    <button type="submit" className="primary" disabled={busy}>Сохранить</button>
   </div>
  </form></>;
}


export function AddPositionDialog({ stoppers, busy, error, onAdd, onClose }: { stoppers: Stopper[]; busy: boolean; error: string; onAdd: (product: StopperProduct, stopperID: number) => void; onClose: () => void }) {
 const [query, setQuery] = useState("");
 const [found, setFound] = useState<{ query: string; items: StopperProduct[]; error: string }>({ query: "", items: [], error: "" });
 const [product, setProduct] = useState<StopperProduct | null>(null);
 const [stopperID, setStopperID] = useState<number | null>(null);
 const search = query.trim();
 useEffect(() => {
  if (search.length < 2) return;
  let active = true;
  const timer = setTimeout(() => {
   searchStopperProducts(search).then(items => { if (active) setFound({ query: search, items, error: "" }); }).catch(e => { if (active) setFound({ query: search, items: [], error: (e as Error).message }); });
  }, 300);
  return () => { active = false; clearTimeout(timer); };
 }, [search]);
 const ready = search.length >= 2 && found.query === search;
 return <Dialog title="Добавить позицию" ariaLabel="Добавить позицию" className="admin-dialog stopper-dialog" closeDisabled={busy} onClose={() => { if (!busy) onClose(); }}>
  <p>Любой товар из каталога, даже без акционной цены. Стоппер обязателен.</p>
  <label>Товар<input autoFocus value={query} placeholder="Начните вводить название или код" onChange={e => setQuery(e.target.value)} /></label>
  <div className="stopper-results" aria-live="polite">{search.length < 2 ? <p>Введите хотя бы 2 символа.</p> : !ready ? <p role="status">Поиск…</p> : found.error ? <p role="alert" className="admin-error">{found.error}</p> : !found.items.length ? <p>Не найдено</p> : found.items.map(v => <button key={v.id} type="button" className={product?.id === v.id ? "on" : ""} disabled={v.added || busy} aria-pressed={product?.id === v.id} onClick={() => setProduct(v)}><span>{v.name}<small>{v.code}</small></span>{v.added && <small>уже в списке</small>}</button>)}</div>
  <div className="stopper-pop-caption">Стоппер</div>
  <div className="stopper-chip-select">{stoppers.map(v => <button key={v.id} type="button" className={stopperID === v.id ? "on" : ""} aria-pressed={stopperID === v.id} disabled={busy} onClick={() => setStopperID(v.id)}><StopperChip stopper={v} /></button>)}</div>
  {error && <p role="alert" className="admin-error">{error}</p>}
  <div className="admin-actions"><button type="button" disabled={busy} onClick={onClose}>Отмена</button><button type="button" className="primary" disabled={!product || stopperID === null || busy} onClick={() => { if (product && stopperID !== null) onAdd(product, stopperID); }}>{busy ? "Добавление…" : "Добавить"}</button></div>
 </Dialog>;
}

export function DeleteStopperDialog({ stopper, busy, error, onYes, onClose }: { stopper: Stopper; busy: boolean; error: string; onYes: () => void; onClose: () => void }) {
 return <Dialog title="Удалить стоппер?" ariaLabel="Удалить стоппер" className="admin-dialog" closeDisabled={busy} onClose={() => { if (!busy) onClose(); }}>
  <p><StopperChip stopper={stopper} /></p>
  {stopper.positions > 0 && <p>Он установлен у {stopper.positions} поз. — они перейдут в «Без стоппера».</p>}
  {error && <p role="alert" className="admin-error">{error}</p>}
  <div className="admin-actions"><button type="button" disabled={busy} onClick={onClose}>Отмена</button><button type="button" className="danger" disabled={busy} onClick={onYes}>Удалить</button></div>
 </Dialog>;
}
