"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AUTH_CHANGED_EVENT, getCurrentUser, restoreSession } from "@/shared/api/auth";
import { filesService, readBase64, type FileEntry, type FileInput } from "@/entities/file/api/files";
import { FILE_FORMAT_ERROR, isAllowedFileName } from "@/entities/file/file-format";
import { creationTarget, treeRows } from "@/entities/file/tree";
import { useTheme } from "@/shared/lib/use-theme";
import { Dialog } from "@/shared/ui/dialog";
import "./admin.css";

function Icon({ entry }: { entry: Pick<FileEntry, "icon" | "is_file"> }) {
  // Raster icons only: uploaded SVG and HTML are never rendered as active content.
  const mime = entry.icon?.startsWith("iVBOR") ? "image/png" : entry.icon?.startsWith("/9j/") ? "image/jpeg" : entry.icon?.startsWith("R0lGOD") ? "image/gif" : entry.icon?.startsWith("UklGR") ? "image/webp" : null;
  // eslint-disable-next-line @next/next/no-img-element
  return mime ? <img alt="" src={`data:${mime};base64,${entry.icon}`} className="file-icon" /> : <span aria-hidden="true" className="file-icon">{entry.is_file ? "📄" : "📁"}</span>;
}
export function AdminPage() {
  useTheme();
  const [access, setAccess] = useState("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const changed = () => { if (active) setAccess(getCurrentUser()?.role === "admin" ? "admin" : "denied"); };
    window.addEventListener(AUTH_CHANGED_EVENT, changed);
    window.addEventListener("storage", changed);
    restoreSession().then(session => { if (active) setAccess(session?.role === "admin" ? "admin" : "denied"); }).catch(() => { if (active) setAccess("error"); });
    return () => { active = false; window.removeEventListener(AUTH_CHANGED_EVENT, changed); window.removeEventListener("storage", changed); };
  }, [retry]);
  return <main className="admin-page"><header className="admin-header"><div><p className="admin-eyebrow">МОЙ МАГАЗИН</p><h1>Администрирование</h1></div><Link href="/">← На главную</Link></header>
    {access === "loading" ? <p role="status">Проверяем доступ…</p> : access === "error" ? <div role="alert">Не удалось проверить сессию. <button onClick={() => { setAccess("loading"); setRetry(retry + 1); }}>Повторить</button></div> : access !== "admin" ? <section className="admin-panel"><h2>Доступ ограничен</h2><p>Войдите на главной странице под пользователем с ролью admin.</p></section> : <><div role="tablist" aria-label="Разделы администрирования" className="admin-tabs"><button id="files-tab" role="tab" aria-selected="true" aria-controls="files-panel">Файлы</button></div><section id="files-panel" role="tabpanel" aria-labelledby="files-tab"><FileManager /></section></>}
  </main>;
}
function CreateIcon({ file = false }: { file?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">{file ? <><path d="M7 3h12l6 6v20H7z" /><path d="M19 3v7h6" /></> : <path d="M3 9V6h10l3 4h13v17H3z" />}<path d="M16 14v9m-4.5-4.5h9" /></svg>;
}
function FileManager() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [deleted, setDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [editor, setEditor] = useState<{ entry?: FileEntry; isFile: boolean; parent: string | null; priority: number } | null>(null);
  const [removing, setRemoving] = useState<FileEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let active = true;
    async function readTree(parent: string | null, visited = new Set<string>()): Promise<FileEntry[]> {
      const children = await filesService.list(parent, deleted);
      const descendants = await Promise.all(children.filter(e => !e.is_file && !visited.has(e.id)).map(e => {
        visited.add(e.id);
        return readTree(e.id, visited);
      }));
      return [...children, ...descendants.flat()];
    }
    readTree(null).then(data => { if (active) { setEntries(data); setError(""); } }).catch(e => { if (active) { setEntries([]); setError(e.message); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deleted, version]);
  const selected = entries.find(entry => entry.id === selectedId);
  function create(isFile: boolean) {
    const target = creationTarget(selected, isFile);
    if (target.parent) setCollapsed(previous => { const next = new Set(previous); next.delete(target.parent!); return next; });
    setEditor({ isFile, ...target });
  }
  function edit(entry: FileEntry) { setEditor({ entry, isFile: entry.is_file, parent: entry.parent_id, priority: entry.priority }); }
  function toggle(id: string) { setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try { await filesService.delete(removing.id, Boolean(removing.deleted_at)); setRemoving(null); if (selectedId === removing.id) setSelectedId(null); load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const visible = treeRows(entries, collapsed, search);
  const target = creationTarget(selected, false);
  const targetName = entries.find(e => e.id === target.parent)?.name ?? "Корень";
  return <div className="admin-panel"><div className="files-toolbar"><h2>Файлы и каталоги</h2></div>
    <div className="files-filters"><input aria-label="Поиск по структуре" placeholder="Поиск файлов и каталогов…" value={search} onChange={e => setSearch(e.target.value)} /><label><input type="checkbox" checked={deleted} onChange={e => { setLoading(true); setDeleted(e.target.checked); }} /> Показывать удалённые</label><button onClick={() => { setLoading(true); load(); }}>Обновить</button></div>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <div className="files-create-bar"><div className="admin-actions"><button className="create-icon" aria-label="Создать каталог" title="Создать каталог" disabled={loading || Boolean(selected?.deleted_at)} onClick={() => create(false)}><CreateIcon /></button><button className="create-icon primary" aria-label="Добавить файл" title="Добавить файл" disabled={loading || Boolean(selected?.deleted_at)} onClick={() => create(true)}><CreateIcon file /></button></div><p>Создать в: <strong>{targetName}</strong></p></div>
    {loading ? <p role="status" className="files-empty">Загрузка…</p> : <div className="files-table-wrap"><table className="files-table"><colgroup><col /><col className="files-type-column" /><col className="files-priority-column" /><col className="files-actions-column" /></colgroup><thead><tr><th>Название</th><th>Тип</th><th>Приоритет</th><th>Действия</th></tr></thead><tbody>
      <tr className={!selected ? "is-selected" : ""} aria-selected={!selected} tabIndex={0} onClick={() => setSelectedId(null)} onKeyDown={e => { if (e.target === e.currentTarget && ["Enter", " "].includes(e.key)) { e.preventDefault(); setSelectedId(null); } }}><td colSpan={4}><span className="file-name"><Icon entry={{ icon: null, is_file: false }} />-</span></td></tr>
      {visible.map(({ entry, depth }) => <tr key={entry.id} tabIndex={0} aria-selected={selectedId === entry.id} className={`${entry.deleted_at ? "is-deleted" : ""} ${selectedId === entry.id ? "is-selected" : ""}`} onClick={() => setSelectedId(entry.id)} onKeyDown={e => { if (e.target === e.currentTarget && ["Enter", " "].includes(e.key)) { e.preventDefault(); setSelectedId(entry.id); } }}><td><div className="tree-name" style={{ paddingLeft: (depth + 1) * 24 }}><span className="tree-branch" />{!entry.is_file ? <button className="tree-toggle" aria-label={`${collapsed.has(entry.id) ? "Развернуть" : "Свернуть"} ${entry.name}`} aria-expanded={Boolean(search) || !collapsed.has(entry.id)} onClick={() => toggle(entry.id)}>{!search && collapsed.has(entry.id) ? "▸" : "▾"}</button> : <span className="tree-toggle-space" />}<span className="file-name"><Icon entry={entry} /><span>{entry.name}{entry.deleted_at && <small>Удалён</small>}</span></span></div></td><td>{entry.is_file ? "Файл" : "Каталог"}</td><td>{entry.priority}</td><td><div className="admin-actions">{!entry.deleted_at && <button className="row-action" aria-label={`Изменить ${entry.name}`} title="Изменить" onClick={() => edit(entry)}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15z" /></svg></button>}<button className="row-action danger" aria-label={`${entry.deleted_at ? "Удалить навсегда" : "Удалить"} ${entry.name}`} title={entry.deleted_at ? "Удалить навсегда" : "Удалить"} onClick={() => { setError(""); setRemoving(entry); }}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div></td></tr>)}
      {visible.length === 0 && <tr><td colSpan={4} className="files-empty">{search ? "Ничего не найдено" : "Создайте каталог или добавьте первый файл."}</td></tr>}
    </tbody></table></div>}
    {editor && <FileEditor entry={editor.entry} isFile={editor.isFile} parent={editor.parent} initialPriority={editor.priority} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
    {removing && <Dialog ariaLabel="Удаление записи" onClose={() => { if (!busy) setRemoving(null); }} className="admin-dialog"><h2>{removing.deleted_at ? "Удалить навсегда?" : "Удалить запись?"}</h2><p>«{removing.name}»{removing.deleted_at ? " и всё содержимое будут окончательно удалены." : " будет помечен как удалённый. Восстановление сервисом не поддерживается."}</p><p>Каталог должен быть пустым, включая удалённые записи.</p>{error && <p role="alert" className="admin-error">{error}</p>}<div className="admin-actions"><button disabled={busy} onClick={() => setRemoving(null)}>Отмена</button><button className="danger" disabled={busy} onClick={remove}>{busy ? "Удаление…" : "Удалить"}</button></div></Dialog>}
  </div>;
}
function FileEditor({ entry, isFile, parent, initialPriority, onClose, onSaved }: { initialPriority: number; entry?: FileEntry; isFile: boolean; parent: string | null; onClose: () => void; onSaved: () => void }) {
  const [id] = useState(() => entry?.id ?? crypto.randomUUID());
  const [name, setName] = useState(entry?.name ?? "");
  const [priority, setPriority] = useState(entry?.priority ?? initialPriority);
  const [icon, setIcon] = useState(entry?.icon ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!name.trim() || /[/\\]/.test(name) || [".", ".."].includes(name.trim())) throw new Error("Введите название без слешей; точки и '..' недопустимы.");
      if (isFile && !entry && !file) throw new Error("Выберите файл для загрузки.");
      if (isFile && (!isAllowedFileName(name) || (file && !isAllowedFileName(file.name)))) throw new Error(FILE_FORMAT_ERROR);
      if (file && file.size > 35 * 1024 * 1024) throw new Error("Максимальный размер файла — 35 Мб.");
      let nextIcon = icon;
      if (iconFile) {
        if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(iconFile.type) || iconFile.size > 1024 * 1024) throw new Error("Иконка: PNG, JPEG, WebP или GIF, до 1Мб.");
        nextIcon = await readBase64(iconFile);
      }
      const input: FileInput = { id, name: name.trim(), priority, parent_id: parent, is_file: isFile, icon: nextIcon, ...(file ? { content: await readBase64(file) } : {}) };
      await (entry ? filesService.update(input) : filesService.create(input));
      onSaved();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Dialog ariaLabel={entry ? "Редактирование записи" : "Новая запись"} onClose={() => { if (!busy) onClose(); }} className="admin-dialog"><form onSubmit={save}><h2>{entry ? "Редактирование" : isFile ? "Новый файл" : "Новый каталог"}</h2><fieldset disabled={busy}>
    {isFile && <label>{entry ? "Заменить содержимое (необязательно)" : "Файл"}<input type="file" accept=".pdf,.html,application/pdf,text/html" required={!entry} onChange={e => { const selected = e.target.files?.[0] ?? null; if (selected && !isAllowedFileName(selected.name)) { setError(FILE_FORMAT_ERROR); setFile(null); e.target.value = ""; return; } setError(""); setFile(selected); if (selected && !name) setName(selected.name); }} /><small>Только PDF и HTML, до 35 Мб. {entry && "Без загрузки содержимое сохранится."}</small></label>}
    <label>Название<input required maxLength={255} value={name} onChange={e => setName(e.target.value)} placeholder={isFile ? "Например, инструкция.pdf" : "Например, Инструкции"} /></label>
    <label>Приоритет<input type="number" required step="1" min={-2147483648} max={2147483647} value={priority} onChange={e => setPriority(Number(e.target.value))} /><small>Меньшее число отображается раньше.</small></label>
    <div className="icon-editor"><Icon entry={{ icon, is_file: isFile }} /><div><label>Иконка<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async e => { const selected = e.target.files?.[0]; if (!selected) return; if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(selected.type) || selected.size > 1024 * 1024) { setError("Иконка: PNG, JPEG, WebP или GIF, до 1 Мб."); e.target.value = ""; return; } setBusy(true); try { setIcon(await readBase64(selected)); setIconFile(selected); setError(""); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }} /><small>{iconFile ? `Выбрано: ${iconFile.name}` : "PNG, JPEG, WebP или GIF, до 1 Мб"}</small></label>{(icon || iconFile) && <button type="button" onClick={() => { setIcon(null); setIconFile(null); }}>Убрать иконку</button>}</div></div>
    {error && <p role="alert" className="admin-error">{error}</p>}<div className="admin-actions"><button type="button" onClick={onClose}>Отмена</button><button className="primary" type="submit">{busy ? "Сохранение…" : entry ? "Сохранить" : "Создать"}</button></div>
  </fieldset></form></Dialog>;
}
