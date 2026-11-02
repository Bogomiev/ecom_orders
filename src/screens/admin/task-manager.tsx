"use client";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { TaskService, taskServiceLabels, rmsList, rmsRequest, typeInput, scheduleInput, type TaskType, type TaskTypeInput, type Schedule, type ScheduleInput } from "@/entities/task/api";
import { qrImageSource } from "@/entities/task/image";
import { describeDays, resizeDays, weekBoundary, weekdays } from "@/entities/task/scheduling";
import { readBase64 } from "@/entities/file/api/files";
import { StorePicker, loadPickerStores, type PickStore } from "@/features/store-picker/store-picker";
import { AdminDialog as Dialog, RefreshButton, SaveActions, shouldCloseAfterSave } from "./admin-controls";

function Action({ kind, label, onClick, disabled }: { kind: "add" | "edit" | "delete"; label: string; onClick: () => void; disabled?: boolean }) {
 return <button type="button" className={`row-action ${kind === "delete" ? "danger" : ""}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={kind === "add" ? "M12 5v14M5 12h14" : kind === "delete" ? "m6 6 12 12M18 6 6 18" : "m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15z"} /></svg></button>;
}
function Confirm({ busy, error, onYes, onClose, title = "Удалить расписание задания?" }: { busy: boolean; error: string; onYes: () => void; onClose: () => void; title?: string }) {
 return <Dialog closeDisabled={busy} title={title} ariaLabel="Подтверждение удаления" className="admin-dialog" onClose={() => { if (!busy) onClose(); }}>
 {error && <p role="alert" className="admin-error">{error}</p>}
 <div className="admin-actions" style={{ justifyContent: "center" }}>
 <button type="button" className="danger" disabled={busy} onClick={onYes}>Да</button>
 <button type="button" disabled={busy} onClick={onClose}>Нет</button>
 </div>
 </Dialog>;
}
export function TaskManager() {
 const [tab, setTab] = useState<"types" | "tasks">("types");
 return <section className="admin-panel"><h2>Задания</h2><div role="tablist" aria-label="Задания" className="admin-tabs"><button id="task-types-tab" role="tab" aria-selected={tab === "types"} aria-controls="task-types-panel" onClick={() => setTab("types")}>Типы заданий</button><button id="generated-tasks-tab" role="tab" aria-selected={tab === "tasks"} aria-controls="generated-tasks-panel" onClick={() => setTab("tasks")}>Сформированные задания</button></div>{tab === "types" ? <div id="task-types-panel" role="tabpanel" aria-labelledby="task-types-tab"><TaskTypes /></div> : <div id="generated-tasks-panel" role="tabpanel" aria-labelledby="generated-tasks-tab"><GeneratedTasks /></div>}</section>;
}

type GeneratedTask = { id: number; type_id: number; store_id: string; start: string; status: string; custom_fields: Record<string, unknown> };
const taskStatusLabels: Record<string, string> = { new: "Новое", in_progress: "В работе", completed: "Выполнено", cancelled: "Отменено" };
function GeneratedTasks() {
 const [data, setData] = useState<{ tasks: GeneratedTask[]; types: TaskType[]; stores: PickStore[] }>({ tasks: [], types: [], stores: [] });
 const [filters, setFilters] = useState({ typeID: "", storeID: "", from: "", to: "" });
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [version, setVersion] = useState(0);
 const [editor, setEditor] = useState<GeneratedTask | null>(null);
 const [removing, setRemoving] = useState<GeneratedTask | null>(null);
 const [busy, setBusy] = useState(false);
 const reload = () => { setLoading(true); setVersion(v => v + 1); };
 async function remove() {
  if (!removing || busy) return;
  setBusy(true); setError("");
  try { await rmsRequest(`tasks/${removing.id}`, "DELETE"); setRemoving(null); reload(); }
  catch (e) { setError((e as Error).message); } finally { setBusy(false); }
 }
 useEffect(() => {
  const controller = new AbortController();
  Promise.all([rmsList<GeneratedTask>("tasks"), rmsList<TaskType>("task_types"), loadPickerStores(controller.signal)]).then(([tasks, types, stores]) => { if (!controller.signal.aborted) { setData({ tasks, types, stores }); setError(""); } }).catch(e => { if (!controller.signal.aborted) setError((e as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
  return () => controller.abort();
 }, [version]);
 const types = new Map(data.types.map(v => [v.id, v.name]));
 const stores = new Map(data.stores.map(v => [v.id, v.name]));
 const invalidPeriod = Boolean(filters.from && filters.to && filters.from > filters.to);
 const filteredTasks = data.tasks.filter(task => {
  const day = task.start.slice(0, 10);
  return !invalidPeriod && (!filters.typeID || task.type_id === Number(filters.typeID))
   && (!filters.storeID || task.store_id === filters.storeID)
   && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to);
 });
 return <><div className="generated-task-filters">
 <label>Тип задания<select value={filters.typeID} onChange={e => setFilters(v => ({ ...v, typeID: e.target.value }))}><option value="">Все типы</option>{data.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
 <label>Магазин<select value={filters.storeID} onChange={e => setFilters(v => ({ ...v, storeID: e.target.value }))}><option value="">Все магазины</option>{data.stores.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select></label>
 <label>Старт с<input type="date" value={filters.from} max={filters.to || undefined} onChange={e => setFilters(v => ({ ...v, from: e.target.value }))} /></label>
 <label>Старт по<input type="date" value={filters.to} min={filters.from || undefined} onChange={e => setFilters(v => ({ ...v, to: e.target.value }))} /></label>
 <button type="button" onClick={() => setFilters({ typeID: "", storeID: "", from: "", to: "" })}>Сбросить</button>
 </div>
 {invalidPeriod && <p role="alert" className="admin-error">Конец периода должен быть не раньше начала.</p>}
 {error && <p role="alert" className="admin-error">{error}</p>}<div className="files-table-wrap"><table className="files-table personnel-table"><caption className="admin-table-tools"><div className="admin-actions"><RefreshButton disabled={loading} onClick={reload} /></div></caption><thead><tr><th>ID</th><th>Тип задания</th><th>Магазин</th><th>Старт</th><th>Статус</th><th>Действия</th></tr></thead><tbody>{!loading && !error && filteredTasks.map(v => <tr key={v.id}><td>{v.id}</td><td>{types.get(v.type_id) ?? v.type_id}</td><td>{stores.get(v.store_id) ?? v.store_id}</td><td>{v.start.replace("T", " ")}</td><td>{taskStatusLabels[v.status] ?? v.status}</td><td><div className="admin-actions"><Action kind="edit" label={`Изменить задание ${v.id}`} disabled={busy} onClick={() => setEditor(v)} /><Action kind="delete" label={`Удалить задание ${v.id}`} disabled={busy} onClick={() => { setError(""); setRemoving(v); }} /></div></td></tr>)}</tbody></table>{loading ? <p role="status">Загрузка…</p> : !error && !invalidPeriod && !filteredTasks.length && <p>Нет сформированных заданий по выбранным условиям</p>}</div>
 {editor && <GeneratedTaskEditor key={editor.id} entry={editor} types={data.types} stores={data.stores} onClose={() => setEditor(null)} onSaved={(saved, close) => { setEditor(close ? null : saved); reload(); }} />}
 {removing && <Confirm title={`Удалить задание ${removing.id}?`} busy={busy} error={error} onYes={() => void remove()} onClose={() => setRemoving(null)} />}</>;
}

function GeneratedTaskEditor({ entry, types, stores, onClose, onSaved }: { entry: GeneratedTask; types: TaskType[]; stores: PickStore[]; onClose: () => void; onSaved: (value: GeneratedTask, close: boolean) => void }) {
 const formID = useId();
 const [value, setValue] = useState({ type_id: entry.type_id, store_id: entry.store_id, start: entry.start.replace(" ", "T").slice(0, 19), status: entry.status });
 const [fields, setFields] = useState(JSON.stringify(entry.custom_fields ?? {}, null, 2));
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 async function save(e: FormEvent) {
  e.preventDefault(); if (busy) return;
  const close = shouldCloseAfterSave(e); setBusy(true); setError("");
  try {
   let customFields: unknown;
   try { customFields = JSON.parse(fields); } catch { throw new Error("Дополнительные поля: укажите корректный JSON-объект."); }
   if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) throw new Error("Дополнительные поля должны быть JSON-объектом.");
   const saved = await rmsRequest<GeneratedTask>(`tasks/${entry.id}`, "PUT", { ...value, custom_fields: customFields });
   onSaved(saved, close);
  } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
 }
 return <Dialog ariaLabel={`Задание (ID: ${entry.id})`} closeDisabled={busy} actions={<SaveActions form={formID} busy={busy} />} className="admin-dialog task-dialog" onClose={() => { if (!busy) onClose(); }}><form id={formID} onSubmit={save}><fieldset disabled={busy}>
 <label>Тип задания<select required value={value.type_id} onChange={e => setValue(v => ({ ...v, type_id: Number(e.target.value) }))}>{!types.some(t => t.id === value.type_id) && <option value={value.type_id}>{value.type_id}</option>}{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
 <label>Магазин<select required value={value.store_id} onChange={e => setValue(v => ({ ...v, store_id: e.target.value }))}>{!stores.some(s => s.id === value.store_id) && <option value={value.store_id}>{value.store_id}</option>}{stores.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select></label>
 <label>Старт<input required type="datetime-local" step={1} value={value.start} onChange={e => setValue(v => ({ ...v, start: e.target.value }))} /></label>
 <label>Статус<select required value={value.status} onChange={e => setValue(v => ({ ...v, status: e.target.value }))}>{Object.entries(taskStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label>
 <label>Дополнительные поля (JSON)<textarea required rows={8} value={fields} onChange={e => setFields(e.target.value)} /></label>
 {error && <p role="alert" className="admin-error">{error}</p>}
 </fieldset></form></Dialog>;
}

function TaskTypes() {
 const [entries, setEntries] = useState<TaskType[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [version, setVersion] = useState(0);
 const [editor, setEditor] = useState<{ entry?: TaskType } | null>(null);
 const [removing, setRemoving] = useState<TaskType | null>(null);
 const [busy, setBusy] = useState(false);
 useEffect(() => {
  let active = true;
  rmsList<TaskType>("task_types").then(v => { if (active) { setEntries(v); setError(""); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, [version]);
 const reload = () => { setLoading(true); setVersion(v => v + 1); };
 async function remove() {
  if (!removing) return; setBusy(true); setError("");
  try { await rmsRequest(`task_types/${removing.id}`, "DELETE"); setRemoving(null); reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
 }
 return <>
 {error && <p role="alert" className="admin-error">{error}</p>}
 {loading ? <p role="status">Загрузка…</p> : <div className="files-table-wrap"><table className="files-table personnel-table"><caption className="admin-table-tools"><div className="admin-actions"><button className="primary" disabled={loading || busy} onClick={() => setEditor({})}>Создать</button><RefreshButton disabled={loading} onClick={reload} /></div></caption><thead><tr><th>ID</th><th>Имя</th><th>Сервис</th><th>Активен</th><th>Приоритет</th><th>Действия</th></tr></thead><tbody>{entries.map(v => <tr key={v.id} className={v.is_active ? "" : "task-inactive"}><td>{v.id}</td><td><button className="personnel-name-link" onClick={() => setEditor({ entry: v })}>{v.name}</button></td><td>{taskServiceLabels[v.service]}</td><td><input type="checkbox" checked={v.is_active} disabled aria-label={`Активен: ${v.name}`} /></td><td>{v.sort_order}</td><td><div className="admin-actions"><Action kind="edit" label={`Изменить ${v.name}`} onClick={() => setEditor({ entry: v })} /><Action kind="delete" label={`Удалить ${v.name}`} onClick={() => { setError(""); setRemoving(v); }} /></div></td></tr>)}</tbody></table>{!entries.length && <p>Нет записей</p>}</div>}
 {editor && <TypeEditor key={editor.entry?.id ?? "new"} entry={editor.entry} onClose={() => setEditor(null)} onSaved={(value, close) => { setEditor(close ? null : { entry: value }); reload(); }} />}
 {removing && <Confirm title={`Удалить тип задания «${removing.name}»?`} busy={busy} error={error} onYes={() => void remove()} onClose={() => setRemoving(null)} />}</>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
 return <label>{label}<span className="task-color"><input type="color" aria-label={`${label}: палитра`} value={/^#[\da-f]{6}$/i.test(value) ? value : "#000000"} onChange={e => onChange(e.target.value)} /><input required aria-label={`${label}: код`} pattern="#[0-9a-fA-F]{6}" value={value} onChange={e => onChange(e.target.value)} placeholder="#2563eb" /></span></label>;
}
function TypeEditor({ entry, onClose, onSaved }: { entry?: TaskType; onClose: () => void; onSaved: (v: TaskType, close: boolean) => void }) {
 const formID = useId();
 const [value, setValue] = useState<TaskTypeInput>(entry ? typeInput(entry) : { name: "", short_name: "", service: TaskService.WithoutService, icon: null, color: "#2563eb", color_dark: "#60a5fa", is_active: true, sort_order: 0, custom_fields: {} });
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const [dirty, setDirty] = useState(false);
 const [generated, setGenerated] = useState(false);
 async function generate() {
  if (!entry || busy) return;
  setBusy(true); setError(""); setGenerated(false);
  try { await rmsRequest(`task_types/${entry.id}/generate`, "POST"); setGenerated(true); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
 }
 function update<K extends keyof TaskTypeInput>(key: K, next: TaskTypeInput[K]) { setDirty(true); setValue(v => ({ ...v, [key]: next })); }
 async function save(e: FormEvent) {
  e.preventDefault(); const close = shouldCloseAfterSave(e); setBusy(true); setError("");
  try { const saved = await rmsRequest<TaskType>(`task_types${entry ? `/${entry.id}` : ""}`, entry ? "PUT" : "POST", value); setDirty(false); onSaved(saved, close); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
 }
 const mime = value.icon?.startsWith("iVBOR") ? "image/png" : value.icon?.startsWith("/9j/") ? "image/jpeg" : value.icon?.startsWith("R0lGOD") ? "image/gif" : value.icon?.startsWith("UklGR") ? "image/webp" : null;
 return <Dialog closeDisabled={busy} ariaLabel={entry ? `${entry.name} (ID: ${entry.id})` : "Новый"} actions={<><SaveActions form={formID} busy={busy} /><button type="button" disabled={!entry || busy} title={entry ? "Генерация за сегодня по сохранённому типу и расписаниям" : "Сначала сохраните тип задания"} onClick={() => void generate()}>Сгенерировать задания</button></>} className="admin-dialog task-dialog" onClose={() => { if (!busy) onClose(); }}><form id={formID} onSubmit={save}><fieldset disabled={busy}>
 <label>Имя<input required value={value.name} onChange={e => update("name", e.target.value)} /></label><label>Краткое имя<input value={value.short_name} onChange={e => update("short_name", e.target.value)} /></label>
 <label>Сервис<select value={value.service} onChange={e => update("service", e.target.value as TaskService)}>{Object.values(TaskService).map(s => <option key={s} value={s}>{taskServiceLabels[s]}</option>)}</select></label>
 {value.service === TaskService.CashCollection && <label>Qr для входа<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async e => {
 const file=e.target.files?.[0]; if(!file)return;
 if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>1024*1024){setError("QR: PNG, JPEG, WebP или GIF, до 1 Мб.");return;}
 setBusy(true);try{update("custom_fields",{...value.custom_fields,qrCodeSrc:await readBase64(file)});setError("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }} />
 {typeof value.custom_fields.qrCodeSrc === "string" && value.custom_fields.qrCodeSrc && <>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img alt="Qr для входа" style={{maxWidth:200}} src={qrImageSource(value.custom_fields.qrCodeSrc)} /><button type="button" onClick={()=>{const fields={...value.custom_fields};delete fields.qrCodeSrc;update("custom_fields",fields);}}>Убрать QR</button></>}
 </label>}
 <div className="task-type-options"><label><input type="checkbox" checked={value.is_active} onChange={e => update("is_active", e.target.checked)} />Активен</label><label>Приоритет<input required type="number" min={-32768} max={32767} step={1} value={value.sort_order} onChange={e => update("sort_order", Number(e.target.value))} /></label>
 <div className="icon-editor" title="PNG, JPEG, WebP или GIF, до 1 Мб.">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 {mime && <img className="file-icon" alt="Иконка задания" src={`data:${mime};base64,${value.icon}`} />}<label>Иконка<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 1024 * 1024) { setError("Иконка: PNG, JPEG, WebP или GIF, до 1 Мб."); e.target.value = ""; return; } setBusy(true); try { update("icon", await readBase64(file)); setError(""); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }} /></label>{value.icon && <button type="button" onClick={() => update("icon", null)}>Убрать иконку</button>}</div></div>
 <div className="task-columns"><ColorField label="Цвет" value={value.color} onChange={v => update("color", v)} /><ColorField label="Цвет в тёмной теме" value={value.color_dark} onChange={v => update("color_dark", v)} /></div>
 {error && <p role="alert" className="admin-error">{error}</p>}{generated && <p role="status">Генерация заданий за сегодня выполнена.</p>}{dirty && <small>Есть несохранённые изменения типа задания.</small>}</fieldset></form>
 {entry ? <Schedules typeID={entry.id} /> : <p>Сохраните тип задания, чтобы добавить расписания.</p>}</Dialog>;
}
function Schedules({ typeID }: { typeID: number }) {
 const [entries, setEntries] = useState<Schedule[]>([]);
 const [loading, setLoading] = useState(true);
 const [version, setVersion] = useState(0);
 const [editor, setEditor] = useState<{ entry?: Schedule } | null>(null);
 const [removing, setRemoving] = useState<Schedule | null>(null);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 useEffect(() => {
  let active = true;
  rmsList<Schedule>("task_scheduling", `task_type_id=${typeID}`).then(v => { if (active) { setEntries(v); setError(""); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, [typeID, version]);
 const reload = () => { setLoading(true); setVersion(v => v + 1); };
 async function remove() { if (!removing) return; setBusy(true); setError(""); try { await rmsRequest(`task_scheduling/${removing.id}`, "DELETE"); setRemoving(null); reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
 return <section className="task-schedules"><h2>Расписания</h2>{error && <p role="alert" className="admin-error">{error}</p>}
 {loading ? <p role="status">Загрузка…</p> : <div className="files-table-wrap"><table className="files-table personnel-table"><caption className="admin-table-tools"><div className="admin-actions"><Action kind="add" label="Создать расписание" disabled={loading} onClick={() => setEditor({})} /><RefreshButton disabled={loading} onClick={reload} /></div></caption><thead><tr><th>Активно</th><th>Период с</th><th>Период по</th><th>Периодичность, недель</th><th>Дни</th><th>Время</th><th>Действия</th></tr></thead><tbody>{entries.map(v => <tr key={v.id} className={v.is_active ? "" : "task-inactive"}><td><input type="checkbox" checked={v.is_active} disabled aria-label={`Активно расписание ${v.id}`} /></td><td>{v.period_from}</td><td>{v.period_to}</td><td>{v.frequency}</td><td>{describeDays(v.days)}</td><td>{v.time ?? "—"}</td><td><div className="admin-actions"><Action kind="edit" label={`Изменить расписание ${v.id}`} onClick={() => setEditor({ entry: v })} /><Action kind="delete" label={`Удалить расписание ${v.id}`} onClick={() => { setError(""); setRemoving(v); }} /></div></td></tr>)}</tbody></table>{!entries.length && <p>Нет расписаний</p>}</div>}
 {editor && <ScheduleEditor typeID={typeID} entry={editor.entry} onClose={() => setEditor(null)} onSaved={close => { if (close) setEditor(null); reload(); }} />}
 {removing && <Confirm busy={busy} error={error} onYes={() => void remove()} onClose={() => setRemoving(null)} />}</section>;
}
function ScheduleEditor({ typeID, entry: initialEntry, onClose, onSaved }: { typeID: number; entry?: Schedule; onClose: () => void; onSaved: (close: boolean) => void }) {
 const formID = useId();
 const [entry, setEntry] = useState(initialEntry);
 const [value, setValue] = useState<ScheduleInput>(entry ? { ...scheduleInput(entry), task_type_id: typeID } : { task_type_id: typeID, frequency: 1, period_from: "", period_to: "", days: Array(7).fill(0), time: null, is_active: true, stores: [] });
 const [stores, setStores] = useState<PickStore[]>([]);
 const [picker, setPicker] = useState<"single" | "multiple" | null>(null);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const [storeError, setStoreError] = useState("");
 useEffect(() => { const c = new AbortController(); loadPickerStores(c.signal).then(setStores).catch(e => { if (!c.signal.aborted) setStoreError(e.message); }); return () => c.abort(); }, []);
 function update<K extends keyof ScheduleInput>(key: K, next: ScheduleInput[K]) { setValue(v => ({ ...v, [key]: next })); }
 async function save(e: FormEvent) {
  e.preventDefault(); const close = shouldCloseAfterSave(e); setBusy(true); setError("");
  try { if (value.period_to < value.period_from) throw new Error("Конец периода должен быть не раньше начала."); const saved = await rmsRequest<Schedule>(`task_scheduling${entry ? `/${entry.id}` : ""}`, entry ? "PUT" : "POST", { ...value, task_type_id: typeID }); setEntry(saved); onSaved(close); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
 }
 let grid: ReactNode = null;
 if (value.period_from && value.period_to) grid = <div className="files-table-wrap"><table className="files-table task-week-grid"><caption>Цикл повторяется каждые {value.frequency} нед. с {value.period_from}</caption><thead><tr><th>Неделя</th>{weekdays.map(d => <th key={d}>{d}</th>)}</tr></thead><tbody>{Array.from({ length: value.frequency }, (_, week) => <tr key={week}><th>{week + 1}</th>{weekdays.map((day, d) => { const i = week * 7 + d; return <td key={d}><input type="checkbox" aria-label={`Неделя ${week + 1}, ${day}`} checked={value.days[i] === 1} onChange={e => update("days", value.days.map((v, n) => n === i ? Number(e.target.checked) : v))} /></td>; })}</tr>)}</tbody></table></div>;
 return <><Dialog closeDisabled={busy} ariaLabel={entry ? `Расписание (ID: ${entry.id})` : "Новое расписание"} actions={<SaveActions form={formID} busy={busy} />} className="admin-dialog task-dialog" onClose={() => { if (!busy) onClose(); }}><form id={formID} onSubmit={save}><fieldset disabled={busy}>
 <label><input type="checkbox" checked={value.is_active} onChange={e => update("is_active", e.target.checked)} />Активно</label><label className="task-frequency">Периодичность, недель<select value={value.frequency} onChange={e => { const f = Number(e.target.value); setValue(v => ({ ...v, frequency: f, days: resizeDays(v.days, f) })); }}>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
 <div className="task-period"><label>Период с (понедельник)<input required type="date" value={value.period_from} onChange={e => update("period_from", weekBoundary(e.target.value, false))} /></label><label>Период по (воскресенье)<input required type="date" min={value.period_from || undefined} value={value.period_to} onChange={e => update("period_to", weekBoundary(e.target.value, true))} /></label><label>Время<input type="time" step={1} value={value.time ?? ""} onChange={e => update("time", e.target.value || null)} /></label></div>{grid}
 <h2>Магазины</h2>
 {storeError && <p role="alert" className="admin-error">{storeError}</p>}<div className="files-table-wrap schedule-stores-wrap"><table className="files-table personnel-table schedule-stores"><caption className="admin-table-tools"><div className="admin-actions"><Action kind="add" label="Добавить магазин" onClick={() => setPicker("single")} /><button type="button" onClick={() => setPicker("multiple")}>Подбор магазинов</button></div></caption><thead><tr><th>Код</th><th>Магазин</th><th>Действия</th></tr></thead><tbody>{value.stores.map(id => { const s = stores.find(v => v.id === id); return <tr key={id}><td>{s?.code ?? "—"}</td><td>{s?.name ?? id}</td><td><Action kind="delete" label={`Удалить магазин ${s?.name ?? id}`} onClick={() => update("stores", value.stores.filter(v => v !== id))} /></td></tr>; })}{!value.stores.length && <tr><td colSpan={3} className="schedule-stores-empty">Магазины не выбраны</td></tr>}</tbody></table></div>
 {error && <p role="alert" className="admin-error">{error}</p>}</fieldset></form></Dialog>
 {picker && <StorePicker multiple={picker === "multiple"} selected={value.stores} onClose={() => setPicker(null)} onPick={s => { setStores(v => v.some(v => v.id === s.id) ? v : [...v, s]); setValue(v => ({ ...v, stores: v.stores.includes(s.id) ? v.stores : [...v.stores, s.id] })); }} />}</>;
}
