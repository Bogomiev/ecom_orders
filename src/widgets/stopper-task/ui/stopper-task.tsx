"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/shared/ui/dialog";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { formatStopperPrice, stopperTextColor, storageMode } from "@/entities/stopper/model";
import { completeStopperTask, loadStopperTask, saveStopperTaskCheck, startStopperTask } from "../api";
import { formatDayMonth, formatStock, formatTaskStart, groupStopperTaskItems, sheetsLabel, stockValue, stopperTaskCounts, stopperTaskItemID, stopperTaskLeft, visibleStopperTaskItems, paginate, type StopperTask as Task, type StopperTaskFilter, type StopperTaskItem } from "../model/stopper-task";
import { StopperSheet, printStopperSheet, stopperSheetCss } from "./stopper-sheet";
import "./stopper-task.css";

export type StopperTaskProps = { task_id: number; onClose: () => void };

const icons = {
 tag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>,
 yes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>,
 print: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="7" /></svg>,
 search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
 chevron: <svg className="stopper-task-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
};

function Chip({ item, off }: { item: StopperTaskItem; off?: boolean }) {
 return <span className={`stopper-task-chip${off ? " off" : ""}`} title={item.stopper} style={{ background: item.stopper_color, color: stopperTextColor(item.stopper_color) }}>{item.stopper}</span>;
}

export function StopperTask({ task_id, onClose }: StopperTaskProps) {
 const [task, setTask] = useState<Task | null>(null);
 const [error, setError] = useState("");
 const [version, setVersion] = useState(0);
 const [all, setAll] = useState(false);
 const [query, setQuery] = useState("");
 const [filter, setFilter] = useState<StopperTaskFilter>("all");
 const [closed, setClosed] = useState<boolean[]>([]);
 const [busy, setBusy] = useState("");
 const [toast, setToast] = useState<{ title: string; text: string } | null>(null);
 const [preview, setPreview] = useState(false);
 const [completing, setCompleting] = useState<"ask" | "busy" | null>(null);
 const sheet = useRef<HTMLDivElement>(null);

 useEffect(() => {
  let active = true;
  loadStopperTask(task_id).then(data => { if (active) { setTask(data); setError(""); } }).catch(e => { if (active) setError((e as Error).message); });
  return () => { active = false; };
 }, [task_id, version]);
 useEffect(() => {
  if (!toast) return;
  const timer = setTimeout(() => setToast(null), 3200);
  return () => clearTimeout(timer);
 }, [toast]);

 const open = task?.status === "new" || task?.status === "in_progress";
 async function mark(item: StopperTaskItem, result: StopperTaskItem["result"]) {
  if (!task || busy) return;
  const id = stopperTaskItemID(item);
  setBusy(id); setError("");
  try {
   const saved = await saveStopperTaskCheck(task_id, item, result);
   setTask(current => current && { ...current, status: saved.status, items: current.items.map(v => stopperTaskItemID(v) === id ? { ...v, result } : v) });
   if (result === "bad") setToast({ title: "Ценник отмечен для печати", text: item.name });
   if (result === "removed") setToast({ title: "Снятие стоппера подтверждено", text: item.name });
  } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
 }
 async function complete() {
  setCompleting("busy"); setError("");
  try {
   if (task?.status === "new") await startStopperTask(task_id);
   await completeStopperTask(task_id); onClose();
  }
  catch (e) { setError((e as Error).message); setCompleting(null); }
 }
 function print() {
  if (sheet.current) printStopperSheet(sheet.current, `Стопперы — ${task?.store_name ?? ""}`, () => setError("Не удалось подготовить лист к печати. Попробуйте ещё раз."));
 }

 const items = task?.items ?? [];
 const counts = stopperTaskCounts(items, all);
 const { check, remove } = visibleStopperTaskItems(items, { all, query, filter });
 const groups = groupStopperTaskItems(check, remove);
 // The A4 register lists the same positions as the screen with the current filters.
 const printCheck = check, printRemove = remove;
 // The store may complete the task with positions left: they come back in the next task.
 const left = stopperTaskLeft(items);
 const printSheets = paginate(Array.from({ length: printCheck.length + printRemove.length })).length;
 const filterChip = (value: StopperTaskFilter, label: string, extra = "") => <button type="button" className={`stopper-task-filter${extra}${filter === value ? " active" : ""}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>;

 return <Dialog ariaLabelledBy="stopper-task-title" onClose={() => { if (!preview && !completing) onClose(); }} closeOnBackdrop={false} className="stopper-task">
  <header className="stopper-task-head">
   <span className="stopper-task-icon">{icons.tag}</span>
   <div className="stopper-task-title"><h2 id="stopper-task-title"><span className="full">Задание: стопперы на акционные товары</span><span className="short">Стопперы</span></h2>
    {task && <small>{task.store_code} — {task.store_name} · обновлено {formatTaskStart(task.start)} · {all ? "все позиции" : "только товары на остатках"} · по режимам хранения</small>}</div>
   <span className="stopper-task-count">{counts.base}</span>
   <button type="button" className="stopper-task-print" disabled={!task} onClick={() => setPreview(true)}>{icons.print}Распечатать</button>
   {open && <button type="button" className={`stopper-task-complete${left ? " early" : ""}`} title={left ? `Не сделано позиций: ${left}` : undefined} onClick={() => setCompleting("ask")}>Завершить</button>}
   <button type="button" className="stopper-task-close" aria-label="Закрыть" onClick={onClose}>×</button>
  </header>
  {task && <div className="stopper-task-tools">
   <button type="button" className={`stopper-task-filter${!all ? " active" : ""}`} aria-pressed={!all} onClick={() => setAll(false)}>На остатках · {counts.inStock}</button>
   <button type="button" className={`stopper-task-filter${all ? " active" : ""}`} aria-pressed={all} onClick={() => setAll(true)}>Все, включая без остатка · {counts.total}</button>
   <label className="stopper-task-search">{icons.search}<input type="search" placeholder="Название, код или штрих-код" aria-label="Найти товар" value={query} onChange={e => setQuery(e.target.value)} /></label>
   <span className="stopper-task-divider" />
   {filterChip("all", "Все")}
   {filterChip("todo", `Не проверено · ${counts.base - counts.done + counts.removeLeft}`)}
   {filterChip("bad", `Ценник в печать · ${counts.bad}`)}
   {counts.remove > 0 && filterChip("rm", `Снять · ${counts.removeLeft}`, " remove")}
   <div className="stopper-task-progress">Проверено {counts.done} из {counts.base}<div className="bar"><span style={{ width: `${counts.base ? counts.ok / counts.base * 100 : 0}%` }} className="ok" /><span style={{ width: `${counts.base ? counts.bad / counts.base * 100 : 0}%` }} className="bad" /></div></div>
  </div>}
  <div className="stopper-task-body">
   {error && <p role="alert" className="stopper-task-error">{error}{!task && <button type="button" onClick={() => setVersion(v => v + 1)}>Повторить</button>}</p>}
   {!task && !error && <p role="status" className="stopper-task-empty"><LoadingDots /></p>}
   {task && !open && <p className="stopper-task-note">Задание {task.status === "completed" ? "завершено" : "отменено"}, отметки изменить нельзя.</p>}
   {groups.map(group => {
    const mode = storageMode(group.thermal), isOpen = !closed.includes(group.thermal);
    const done = group.check.filter(v => v.result).length, bad = group.check.filter(v => v.result === "bad").length, left = group.remove.filter(v => !v.result).length, matched = group.check.every(v => v.result === "ok");
    return <section key={String(group.thermal)} className="stopper-task-group">
     <button type="button" className={`stopper-task-subhead${isOpen ? " open" : ""}`} aria-expanded={isOpen} onClick={() => setClosed(v => v.includes(group.thermal) ? v.filter(x => x !== group.thermal) : [...v, group.thermal])}>
      {icons.chevron}<span className="ic">{mode.icon}</span>{mode.label}<span className="place"> · {mode.place}</span><span className="cnt">{group.check.length + group.remove.length}</span>
      <span className="state">{matched && !left ? <span className="done">всё сделано ✓</span> : <>{group.check.length > 0 && <><span className="long">проверено </span>{done} из {group.check.length}</>}{left > 0 && <>{group.check.length > 0 && " · "}<span className="bad"><span className="long">снять </span><span className="short">✕ </span>{left}</span></>}</>}{bad > 0 && <> · <span className="bad"><span className="long">в печать </span><span className="short">🖨 </span>{bad}</span></>}</span>
     </button>
     {isOpen && group.remove.map(v => <div key={stopperTaskItemID(v)} className={`stopper-task-row remove${v.result ? " ok" : ""}`}>
      <div><div className="name">{v.name}</div><div className="sub"><span className="code">{v.code}</span><span className="tag">снять стоппер</span></div></div>
      <div className={`stock${stockValue(v) > 0 ? "" : " zero"}`}><small>Остаток</small>{formatStock(v)}</div>
      <div><Chip item={v} off /></div>
      <div className="price"><div className="old ended">закончился {v.to ? formatDayMonth(v.to) : ""}</div><div className="new regular">{formatStopperPrice(v.price)}</div></div>
      <div className="acts">{v.result ? <><span className="status ok">{icons.yes} Стоппер снят</span>{open && <button type="button" className="undo" disabled={Boolean(busy)} onClick={() => void mark(v, "")}>изменить</button>}</> : <button type="button" className="btn remove" disabled={!open || Boolean(busy)} onClick={() => void mark(v, "removed")}>{icons.yes}Стоппер снят</button>}</div>
     </div>)}
     {isOpen && group.check.map(v => <div key={stopperTaskItemID(v)} className={`stopper-task-row${stockValue(v) > 0 ? "" : " nostock"}${v.result ? ` ${v.result}` : ""}`}>
      <div><div className="name">{v.name}</div><div className="sub"><span className="code">{v.code}</span></div></div>
      <div className={`stock${stockValue(v) > 0 ? "" : " zero"}`}><small>Остаток</small>{formatStock(v)}</div>
      <div><Chip item={v} /></div>
      <div className="price">{v.promo_price ? <><div className="old">{formatStopperPrice(v.price)}</div><div className="new">{formatStopperPrice(v.promo_price)}</div></> : <><div className="old blank">&nbsp;</div><div className="new regular">{formatStopperPrice(v.price)}</div></>}</div>
      <div className="acts">{v.result === "ok" ? <><span className="status ok">{icons.yes} Соответствует</span>{open && <button type="button" className="undo" disabled={Boolean(busy)} onClick={() => void mark(v, "")}>изменить</button>}</>
       : v.result === "bad" ? <><span className="status bad">Ценник в печати</span>{open && <button type="button" className="undo" disabled={Boolean(busy)} onClick={() => void mark(v, "")}>изменить</button>}</>
       : <><button type="button" className="btn yes" disabled={!open || Boolean(busy)} onClick={() => void mark(v, "ok")}>{icons.yes}Соответствует</button><button type="button" className="btn no" disabled={!open || Boolean(busy)} onClick={() => void mark(v, "bad")}>{icons.print}Не соответствует</button></>}</div>
     </div>)}
    </section>;
   })}
   {task && !groups.length && <p className="stopper-task-empty">{filter === "rm" ? "Снимать нечего ✓" : filter === "todo" ? "Всё проверено ✓" : query ? "Ничего не найдено" : "Стопперов для магазина нет"}</p>}
  </div>
  {toast && <div className="stopper-task-toast" role="status"><span className="tick">✓</span><span>{toast.title}<small>{toast.text}</small></span></div>}
  {preview && task && <Dialog ariaLabel="Печать задания" onClose={() => setPreview(false)} className="stopper-task-preview">
   <header><div><b>Печать задания</b><small>{task.store_code} — {task.store_name} · {printCheck.length + printRemove.length} поз. · {sheetsLabel(printSheets)} A4</small></div>
    <button type="button" className="stopper-task-print" onClick={print}>{icons.print}Печать</button>
    <button type="button" className="stopper-task-close" aria-label="Закрыть" onClick={() => setPreview(false)}>×</button></header>
   <div className="scroll"><style>{stopperSheetCss}</style><div ref={sheet}><StopperSheet check={printCheck} remove={printRemove} /></div></div>
  </Dialog>}
  {completing && <Dialog ariaLabel="Завершить задание?" onClose={() => { if (completing !== "busy") setCompleting(null); }} className="stopper-task-confirm">
   <p>Завершить задание?</p>
   {left > 0 && <small>Не сделано позиций: {left}. Они останутся невыполненными и попадут в следующее задание.</small>}
   <div><button type="button" className="primary" disabled={completing === "busy"} onClick={() => void complete()}>Да{completing === "busy" && <LoadingDots />}</button><button type="button" disabled={completing === "busy"} onClick={() => setCompleting(null)}>Нет</button></div>
  </Dialog>}
 </Dialog>;
}
