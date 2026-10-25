"use client";

import { useEffect, useRef, useState } from "react";
import type { FileEntry } from "@/entities/file/api/files";
import { useIsStoreAuthorized } from "@/entities/store";
import { Dialog } from "@/shared/ui/dialog";
import { documentsService } from "../api/documents";
import { filesInFolder, folderPath, FRESH_DAYS, isFresh, documentTitle } from "../model/documents";
import "./documents.css";

function DocumentIcon({ entry }: { entry?: FileEntry }) {
  const icon = entry?.icon;
  const mime = icon?.startsWith("iVBOR") ? "image/png" : icon?.startsWith("/9j/") ? "image/jpeg" : icon?.startsWith("R0lGOD") ? "image/gif" : icon?.startsWith("UklGR") ? "image/webp" : null;
  // eslint-disable-next-line @next/next/no-img-element
  if (mime) return <img className="docs-entry-image" src={`data:${mime};base64,${icon}`} alt="" />;
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">{entry?.is_file ? <><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></> : <path d="M3 7V5h7l3 3h8v12H3z" />}</svg>;
}
function ActionIcon({ print = false }: { print?: boolean }) {
  return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{print ? <><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" /><path d="M17 11h.01" /></> : <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}</svg>;
}
export function Documents() {
  const authorized = useIsStoreAuthorized();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" disabled={!authorized} aria-haspopup="dialog" className="docs-launcher" onClick={() => setOpen(true)}><span className="docs-launcher-icon"><DocumentIcon /></span><span><strong>Документы и материалы</strong><small>Бланки, инструкции и справочные материалы</small></span></button>
    {open && authorized && <DocumentsDialog onClose={() => setOpen(false)} />}
  </>;
}
function DocumentsDialog({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [viewer, setViewer] = useState<{ entry: FileEntry; print: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    documentsService.list(controller.signal).then(setEntries).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [version]);
  const all = filesInFolder(entries, null, query);
  const selectedFolder = selected ?? entries.find(e => !e.is_file && e.parent_id === null)?.id ?? null;
  const files = filesInFolder(entries, query ? null : selectedFolder, query, !query && fresh);
  const current = entries.find(e => e.id === selectedFolder);
  const crumbs = current ? [...folderPath(current, entries), current] : [];
  const freshCount = all.filter(e => isFresh(e)).length;
  function select(id: string | null, updated = false) { setSelected(id); setFresh(updated); setQuery(""); }
  function toggle(id: string) { setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function folders(parent: string | null, depth = 0, seen = new Set<string>()): React.ReactNode {
    return entries.filter(e => !e.is_file && e.parent_id === parent && !seen.has(e.id)).map(folder => {
      const nextSeen = new Set(seen).add(folder.id);
      const hasChildren = entries.some(e => !e.is_file && e.parent_id === folder.id);
      const count = filesInFolder(entries, folder.id, query).length;
      return <div key={folder.id} className={depth ? "docs-nav-sub" : ""}>
        <div className={`docs-folder ${!query && !fresh && selectedFolder === folder.id ? "active" : ""}`}>
          {hasChildren && <button className="docs-twisty" aria-label={`${collapsed.has(folder.id) ? "Развернуть" : "Свернуть"} ${folder.name}`} aria-expanded={!collapsed.has(folder.id)} onClick={() => toggle(folder.id)}>{collapsed.has(folder.id) ? "▸" : "▾"}</button>}
          <button className="docs-folder-select" title={folder.name} onClick={() => select(folder.id)}><DocumentIcon entry={folder} /><span>{folder.name}</span><b>{count}</b></button>
        </div>
        {!collapsed.has(folder.id) && folders(folder.id, depth + 1, nextSeen)}
      </div>;
    });
  }
  return <Dialog ariaLabelledBy="documents-title" onClose={onClose} className={`docs-modal ${viewer && /\.html$/i.test(viewer.entry.name) ? "docs-full" : ""}`}>
    <header className="docs-head"><span className="docs-heading-icon"><DocumentIcon /></span><h2 id="documents-title">Документы и материалы</h2><button className="docs-icon-button docs-close" aria-label="Закрыть документы" onClick={onClose}>×</button></header>
    {viewer ? <DocumentViewer key={viewer.entry.id} entry={viewer.entry} autoPrint={viewer.print} onBack={() => setViewer(null)} /> : <>
      <div className="docs-search"><label><span aria-hidden="true">⌕</span><input ref={searchRef} autoFocus aria-label="Поиск документов" placeholder="Найти документ…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Очистить поиск" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>×</button>}</label></div>
      {loading ? <p role="status" className="docs-empty">Загрузка документов…</p> : error ? <div role="alert" className="docs-empty"><p>{error}</p><button className="docs-button" onClick={() => { setError(""); setLoading(true); setVersion(v => v + 1); }}>Повторить</button></div> : <div className="docs-store">
        <nav className="docs-nav" aria-label="Каталоги документов">
          {freshCount > 0 && <button className={`docs-nav-special ${fresh && !query ? "active" : ""}`} onClick={() => select(null, true)}><span aria-hidden="true">◷</span><span>Обновлённые</span><b>{freshCount}</b></button>}
          <p className="docs-subhead">Разделы</p>{folders(null)}
        </nav>
        <section className="docs-list-wrap" aria-label="Файлы">
          <nav className="docs-crumbs" aria-label="Путь каталога">{query ? "Результаты поиска" : fresh ? `Обновлённые за ${FRESH_DAYS} дней` : <>{crumbs.length ? crumbs.map((folder, index) => <span key={folder.id}>{index > 0 && " / "}<button onClick={() => select(folder.id)}>{folder.name}</button></span>) : "Документы"}</>}</nav>
          <div className="docs-files">{files.length === 0 ? <div className="docs-empty"><strong>{query ? "Ничего не найдено" : "Здесь пока пусто"}</strong><p>{query ? "Попробуйте другое название." : "Документы появятся после добавления в админке."}</p></div> : files.map((file, index) => {
            const path = folderPath(file, entries).map(e => e.name).join(" · ") || "Без каталога";
            const previous = index ? folderPath(files[index - 1], entries).map(e => e.name).join(" · ") || "Без каталога" : null;
            const pdf = /\.pdf$/i.test(file.name);
            return <div key={file.id}>{path !== previous && <h3 className="docs-group-title">{path}</h3>}<article className={`docs-file ${isFresh(file) ? "docs-file-recent" : ""}`}><button className="docs-file-main" onClick={() => setViewer({ entry: file, print: false })}><span className="docs-file-icon"><DocumentIcon entry={file} /></span><span className="docs-file-text"><strong title={file.name}>{file.name}</strong><small className={isFresh(file) ? "docs-fresh" : ""}>Обновлено {new Date(file.updated_at).toLocaleDateString("ru-RU")} · {pdf ? "PDF" : "HTML"}</small></span></button><div className="docs-file-actions">{pdf && <button className="docs-icon-button" aria-label={`Печать ${file.name}`} title="Печать" onClick={() => setViewer({ entry: file, print: true })}><ActionIcon print /></button>}<button className="docs-icon-button" aria-label={`Посмотреть ${file.name}`} title="Посмотреть" onClick={() => setViewer({ entry: file, print: false })}><ActionIcon /></button></div></article></div>;
          })}</div>
        </section>
      </div>}
    </>}
  </Dialog>;
}
function DocumentViewer({ entry, autoPrint, onBack }: { entry: FileEntry; autoPrint: boolean; onBack: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const iframe = useRef<HTMLIFrameElement>(null);
  const printed = useRef(false);
  const pdf = /\.pdf$/i.test(entry.name);
  const title = documentTitle(entry.name);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    documentsService.content(entry, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [entry, retry]);
  function print() { iframe.current?.contentWindow?.focus(); iframe.current?.contentWindow?.print(); }
  return <section className="docs-viewer"><div className="docs-viewer-bar"><button className="docs-button" onClick={onBack}>← Назад</button><strong title={title}>{title}</strong>{pdf && <button className="docs-button docs-print" disabled={!ready} onClick={print}><ActionIcon print />Печать</button>}</div>
    {error ? <div role="alert" className="docs-empty"><p>{error}</p><button className="docs-button" onClick={() => { setError(""); setRetry(v => v + 1); }}>Повторить</button></div> : !url ? <p role="status" className="docs-empty">Загрузка документа…</p> : <iframe ref={iframe} src={url} title={title} sandbox={pdf ? undefined : "allow-scripts"} onLoad={() => { setReady(true); if (pdf && autoPrint && !printed.current) { printed.current = true; print(); } }} />}
  </section>;
}
