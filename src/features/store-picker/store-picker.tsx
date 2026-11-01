"use client";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/shared/api/auth";
import { AdminDialog as Dialog } from "@/screens/admin/admin-controls";

export type PickStore = { id: string; code: string; name: string };
export async function loadPickerStores(signal?: AbortSignal): Promise<PickStore[]> {
 const response = await authenticatedFetch("/api/rms/stores", { signal });
 const data = await response.json();
 if (!response.ok) throw new Error(data.messages?.join("\n") || "Не удалось загрузить магазины");
 return data.items;
}
export function StorePicker({ selected, multiple, onPick, onClose }: { selected: string[]; multiple: boolean; onPick: (store: PickStore) => void; onClose: () => void }) {
 const [stores, setStores] = useState<PickStore[]>([]);
 const [query, setQuery] = useState("");
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(true);
 const [retry, setRetry] = useState(0);
 useEffect(() => {
  const controller = new AbortController();
  loadPickerStores(controller.signal).then(setStores).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
  return () => controller.abort();
 }, [retry]);
 const normalized = query.trim().toLocaleLowerCase("ru");
 const visible = stores.filter(s => `${s.code} ${s.name}`.toLocaleLowerCase("ru").includes(normalized));
 return <Dialog ariaLabel="Подбор магазинов" className="admin-dialog task-dialog" onClose={onClose}><p>{multiple ? "Выбирайте магазины по очереди. Форма останется открытой." : "Выберите магазин."}</p><label>Поиск<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Код или название" /></label>
 {error && <p role="alert" className="admin-error">{error} <button onClick={() => { setError(""); setLoading(true); setRetry(v => v + 1); }}>Повторить</button></p>}
 {loading ? <p role="status">Загрузка…</p> : <div className="files-table-wrap"><table className="files-table personnel-table"><thead><tr><th>Код</th><th>Магазин</th><th>Выбор</th></tr></thead><tbody>{visible.map(s => <tr key={s.id}><td>{s.code}</td><td>{s.name}</td><td><button type="button" disabled={selected.includes(s.id)} onClick={() => { onPick(s); if (!multiple) onClose(); }}>{selected.includes(s.id) ? "Добавлен" : "Выбрать"}</button></td></tr>)}</tbody></table>{!visible.length && <p>Магазины не найдены</p>}</div>}
 <div className="admin-actions"><button type="button" onClick={onClose}>{multiple ? "Готово" : "Закрыть"}</button></div></Dialog>;
}
