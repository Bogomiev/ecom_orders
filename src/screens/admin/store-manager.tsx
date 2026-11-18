"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { rmsRequest } from "@/entities/task/api";
import { AdminDialog, RefreshButton, SaveActions, shouldCloseAfterSave } from "./admin-controls";

type AdminStore = {
  id: string;
  code: string;
  name: string;
  address: string;
  price_type: string;
  price_type_promo: string;
  sale_point_tag: string;
  created_at: string;
  updated_at: string;
};

const tagMaxLength = 100;
const readOnlyFields = [
  ["id", "Идентификатор"],
  ["code", "Код"],
  ["name", "Название"],
  ["address", "Адрес"],
  ["price_type", "Тип цены"],
  ["price_type_promo", "Тип акционной цены"],
  ["created_at", "Создан"],
  ["updated_at", "Изменён"],
] as const;

export function StoreManager() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [editor, setEditor] = useState<AdminStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    rmsRequest<AdminStore[]>("admin/stores")
      .then(items => {
        if (active) setStores(items);
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [version]);

  const query = search.trim().toLocaleLowerCase("ru");
  const visible = stores.filter(store =>
    [store.code, store.name, store.address, store.sale_point_tag].some(value => value.toLocaleLowerCase("ru").includes(query))
  );

  function reload() {
    setError("");
    setLoading(true);
    setVersion(value => value + 1);
  }

  return <div className="admin-panel">
    <header className="admin-section-header">
      <div className="files-filters">
        <input aria-label="Поиск магазинов" placeholder="Поиск магазинов…" value={search} onChange={event => setSearch(event.target.value)} />
      </div>
      <div className="admin-actions"><RefreshButton disabled={loading} onClick={reload} /></div>
    </header>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <div className="files-table-wrap admin-scroll-table" role="region" aria-label="Список магазинов" tabIndex={0}>
      <table className="files-table personnel-table stores-table">
        
        <thead><tr><th>Код</th><th>Название</th><th>Адрес</th><th>sale_point_tag</th><th>Действия</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5}><span role="status">Загрузка…</span></td></tr> : visible.map(store => (
            <tr key={store.id}>
              <td>{store.code}</td>
              <td><button type="button" className="personnel-name-link" onClick={() => setEditor(store)}>{store.name}</button></td>
              <td>{store.address}</td>
              <td>{store.sale_point_tag || "—"}</td>
              <td><div className="admin-actions">
                <button type="button" className="row-action" aria-label={`Изменить ${store.name}`} title="Изменить" onClick={() => setEditor(store)}>
                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15z" /></svg>
                </button>
              </div></td>
            </tr>
          ))}
          {!loading && !error && visible.length === 0 && <tr><td colSpan={5} className="files-empty">{query ? "Ничего не найдено" : "Нет магазинов"}</td></tr>}
        </tbody>
      </table>
    </div>
    {editor && <StoreEditor store={editor} onClose={() => setEditor(null)} onSaved={(saved, close) => {
      setStores(items => items.map(item => item.id === saved.id ? saved : item));
      setEditor(close ? null : saved);
    }} />}
  </div>;
}

function StoreEditor({ store, onClose, onSaved }: {
  store: AdminStore;
  onClose: () => void;
  onSaved: (store: AdminStore, close: boolean) => void;
}) {
  const formID = useId();
  const [tag, setTag] = useState(store.sale_point_tag);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const close = shouldCloseAfterSave(event);
    if (Array.from(tag).length > tagMaxLength) {
      setError(`Допустимо не более ${tagMaxLength} символов.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await rmsRequest<AdminStore>(`admin/stores/${store.id}`, "PUT", { sale_point_tag: tag });
      onSaved(saved, close);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <AdminDialog ariaLabel="Редактирование магазина" title="Редактирование магазина" className="admin-dialog store-editor"
    actions={<SaveActions form={formID} busy={busy} />} closeDisabled={busy} onClose={() => { if (!busy) onClose(); }}>
    <form id={formID} onSubmit={save}>
      <fieldset disabled={busy}>
        {readOnlyFields.map(([key, label]) => <label key={key}>{label}<input readOnly value={store[key]} /></label>)}
        <label>Метка точки продаж<input autoFocus value={tag} onChange={event => setTag(event.target.value)} /></label>
        {error && <p role="alert" className="admin-error">{error}</p>}
      </fieldset>
    </form>
  </AdminDialog>;
}
