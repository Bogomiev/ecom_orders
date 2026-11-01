"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { authenticatedFetch } from "@/shared/api/auth";
import { AdminDialog as Dialog, RefreshButton } from "./admin-controls";

type Role = { id: number; name: string };
type StoreFlags = { seller_selection_available: boolean; store_selection_available: boolean; store_selection_required: boolean };
type Position = Role & StoreFlags & { roles: Role[] };
type User = Role & StoreFlags & { user_token: string; isAdmin: boolean; position: number | null; position_name: string | null; login_blocked_until: string | null; roles?: Role[] };
type Kind = "roles" | "positions" | "users";
type Entry = Role | Position | User;
const ROLE_NAMES = ["admin", "orders", "products", "documents", "goods-receipts", "goods-distribution"] as const;
const labels: Record<Kind,string> = { roles: "Роли", positions: "Должности", users: "Пользователи" };
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
 const response = await authenticatedFetch(`/api/rms/${path}`, {method, ...(body === undefined ? {} : {headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)})});
 const data = await response.json();
 if (!response.ok) throw new Error(response.status === 409 ? "Операция невозможна: запись используется в связанных таблицах или такое значение уже существует. Удалите зависимости либо измените значение." : data.messages?.join("\n") || "Ошибка RMS");
 return data.data;
}
async function list<T>(kind: Kind): Promise<T[]> {
 const out: T[] = [];
 for (let offset=0;;offset+=100) {
  const page = await request<T[]>(`${kind}?limit=100&offset=${offset}`);
  out.push(...page); if (page.length<100) return out;
 }
}
export function PersonnelManager() {
 const [kind,setKind] = useState<Kind>("roles");
 const [roles,setRoles] = useState<Role[]>([]);
 const [positions,setPositions] = useState<Position[]>([]);
 const [users,setUsers] = useState<User[]>([]);
 const [error,setError] = useState("");
 const [loading,setLoading] = useState(true);
 const [version,setVersion] = useState(0);
 const [editor,setEditor] = useState<{kind:Kind; entry?:Entry} | null>(null);
 const [removing,setRemoving] = useState<Entry | null>(null);
 const [busy,setBusy] = useState(false);
 const reload = useCallback(() => {setLoading(true);setVersion(v=>v+1);},[]);
 useEffect(()=>{
  let active=true;
  Promise.all([list<Role>("roles"),list<Position>("positions"),list<User>("users")]).then(([r,p,u])=>{if(active){setRoles(r);setPositions(p);setUsers(u);setError("");}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[version]);
 const entries: Entry[] = kind==="roles" ? roles : kind==="positions" ? positions : users;
 async function edit(entry:Entry) {
  setBusy(true); setError("");
  try {setEditor({kind,entry:await request<Entry>(`${kind}/${entry.id}`)});} catch(e){setError((e as Error).message);} finally{setBusy(false);}
 }
 async function remove() {
  if(!removing)return; setBusy(true); setError("");
  try{await request(`${kind}/${removing.id}`,"DELETE");setRemoving(null);reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <div className="admin-panel"><div role="tablist" aria-label="Пользователи и роли" className="admin-tabs">{(Object.keys(labels) as Kind[]).map(k=><button key={k} role="tab" aria-selected={kind===k} onClick={()=>{setKind(k);setError("");}}>{labels[k]}</button>)}</div><h2>{labels[kind]}</h2>
 
 {error && <p role="alert" className="admin-error">{error}</p>}
 {loading ? <p role="status">Загрузка…</p> : <div className="files-table-wrap"><table className={`files-table personnel-table ${kind === "users" ? "personnel-users" : ""}`}><caption className="admin-table-tools"><div className="admin-actions"><button className="primary" disabled={loading || busy} onClick={()=>setEditor({kind})}>Создать</button><RefreshButton disabled={loading} onClick={reload} /></div></caption><thead><tr><th>Идентификатор</th><th>Имя</th>{kind==="positions" && <><th>Роли</th><th>Доступен выбор продавца</th><th>Доступен выбор магазина</th><th>Выбор магазина обязателен</th></>}{kind==="users" && <><th>Токен</th><th>Админ</th><th>Должность</th><th>Заблокирован до</th></>}<th>Действия</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td>{entry.id}</td><td><button type="button" className="personnel-name-link" disabled={busy} onClick={()=>void edit(entry)}>{entry.name}</button></td>{kind==="positions" && <><td>{(entry as Position).roles.map(r=>r.name).join(", ")}</td><td><input type="checkbox" aria-label="Доступен выбор продавца" checked={(entry as Position).seller_selection_available} disabled /></td><td><input type="checkbox" aria-label="Доступен выбор магазина" checked={(entry as Position).store_selection_available} disabled /></td><td><input type="checkbox" aria-label="Выбор магазина обязателен" checked={(entry as Position).store_selection_required} disabled /></td></>}{kind==="users" && <><td>{(entry as User).user_token}</td><td><input type="checkbox" aria-label={`Админ: ${entry.name}`} checked={(entry as User).isAdmin} disabled /></td><td>{(entry as User).position_name ?? "—"}</td><td>{(entry as User).login_blocked_until ? new Date((entry as User).login_blocked_until!).toLocaleString("ru-RU") : "—"}</td></>}<td><div className="admin-actions"><button className="row-action" aria-label={`Изменить ${entry.name}`} title="Изменить" disabled={busy} onClick={()=>void edit(entry)}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15z" /></svg></button><button className="row-action danger" aria-label={`Удалить ${entry.name}`} title="Удалить" disabled={busy} onClick={()=>{setError("");setRemoving(entry);}}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div></td></tr>)}</tbody></table>{!entries.length && <p>Нет записей</p>}</div>}
 {editor && <PersonnelEditor key={`${editor.kind}-${editor.entry?.id ?? "new"}`} {...editor} roles={roles} positions={positions} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);reload();}} />}
 {removing && <Dialog closeDisabled={busy} title={<>Удалить «{removing.name}»?</>} ariaLabel="Удаление записи" className="admin-dialog" onClose={()=>{if(!busy)setRemoving(null);}}><p>Удаление необратимо. Если запись используется в базе, RMS запретит удаление.</p>{error && <p role="alert" className="admin-error">{error}</p>}<div className="admin-actions"><button disabled={busy} onClick={()=>setRemoving(null)}>Отмена</button><button className="danger" disabled={busy} onClick={()=>void remove()}>Удалить</button></div></Dialog>}
 </div>;
}
function localDate(value: string | null | undefined) {
 if(!value)return "";
 const d=new Date(value); if(Number.isNaN(d.getTime()))return "";
 return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function PersonnelEditor({kind,entry,roles,positions,onClose,onSaved}:{kind:Kind;entry?:Entry;roles:Role[];positions:Position[];onClose:()=>void;onSaved:()=>void}) {
 const u=entry as User | undefined;
 const [sellerAvailable,setSellerAvailable]=useState((entry as Position | undefined)?.seller_selection_available ?? false);
 const [storeAvailable,setStoreAvailable]=useState((entry as Position | undefined)?.store_selection_available ?? false);
 const [storeRequired,setStoreRequired]=useState((entry as Position | undefined)?.store_selection_required ?? false);
 const [name,setName]=useState(entry?.name ?? "");
 const [token,setToken]=useState(u?.user_token ?? "");
 const [admin,setAdmin]=useState(u?.isAdmin ?? false);
 const [position,setPosition]=useState<number | null>(u?.position ?? null);
 const selectedPosition=positions.find(p=>p.id===position);
 const [blocked,setBlocked]=useState(localDate(u?.login_blocked_until));
 const [selected,setSelected]=useState<number[]>((entry as Position | undefined)?.roles?.map(r=>r.id) ?? []);
 const [password,setPassword]=useState("");
 const [passwordOpen,setPasswordOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const adminPosition=positions.find(p=>p.name==="admin");
 function changeAdmin(value:boolean){
  if(value && !adminPosition){setError("Сначала создайте должность admin");return;}
  setAdmin(value);setPosition(value ? adminPosition!.id : position===adminPosition?.id ? null : position);
 }
 async function save(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{
   if(kind==="roles") {
    if(!ROLE_NAMES.some(value=>value===name))throw new Error("Выберите допустимое имя роли");
    if(roles.some(role=>role.name===name && role.id!==entry?.id))throw new Error("Роль с таким именем уже существует");
   }
   const adminRole=roles.find(r=>r.name==="admin");
   const roleIDs=adminRole && selected.includes(adminRole.id) ? [adminRole.id] : selected;
   if(kind==="users" && !entry && !password)throw new Error("Установите пароль нового пользователя");
   const body=kind==="roles" ? {name} : kind==="positions" ? {name,role_ids:roleIDs,seller_selection_available:sellerAvailable,store_selection_available:storeAvailable,store_selection_required:storeRequired} : {name,user_token:token,is_admin:admin,position,login_blocked_until:blocked ? new Date(blocked).toISOString() : null,...(password ? {password} : {})};
   await request(`${kind}${entry ? `/${entry.id}` : ""}`,entry ? "PUT" : "POST",body);
   setPassword("");onSaved();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const title = entry ? `${entry.name} (ID: ${entry.id})` : "Новый";
 return <><Dialog closeDisabled={busy} ariaLabel={title} className="admin-dialog" onClose={()=>{if(!busy)onClose();}}><form onSubmit={save}><fieldset disabled={busy}>
 <label>Имя{kind==="roles" ? <select required value={name} onChange={e=>setName(e.target.value)}><option value="">Выберите имя роли</option>{ROLE_NAMES.map(value=><option key={value} value={value} disabled={roles.some(role=>role.name===value && role.id!==entry?.id)}>{value}</option>)}</select> : <input required maxLength={255} value={name} onChange={e=>setName(e.target.value)} />}</label>
 {kind==="positions" && <><label><input type="checkbox" checked={sellerAvailable} onChange={e=>setSellerAvailable(e.target.checked)} />Доступен выбор продавца</label><label><input type="checkbox" checked={storeAvailable} onChange={e=>{setStoreAvailable(e.target.checked);if(!e.target.checked)setStoreRequired(false);}} />Доступен выбор магазина</label><label><input type="checkbox" checked={storeRequired} onChange={e=>{setStoreRequired(e.target.checked);if(e.target.checked)setStoreAvailable(true);}} />Выбор магазина обязателен</label></>}
 {kind==="positions" && <div><p>Роли</p>{roles.map(r=><label key={r.id}><input type="checkbox" checked={selected.includes(r.id)} onChange={e=>setSelected(e.target.checked ? r.name==="admin" ? [r.id] : [...selected.filter(id=>roles.find(v=>v.id===id)?.name!=="admin"),r.id] : selected.filter(id=>id!==r.id))} />{r.name}</label>)}</div>}
 {kind==="users" && <><label>Токен<input required maxLength={255} autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} /></label><label><input type="checkbox" checked={admin} onChange={e=>changeAdmin(e.target.checked)} />Админ</label><label>Должность<select value={position ?? ""} onChange={e=>{const id=e.target.value ? Number(e.target.value) : null;setPosition(id);setAdmin(positions.find(p=>p.id===id)?.name==="admin");}}><option value="">Не назначена</option>{positions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><p>Роли: {positions.find(p=>p.id===position)?.roles.map(r=>r.name).join(", ") || "—"}</p><label><input type="checkbox" checked={selectedPosition?.seller_selection_available ?? false} disabled />Доступен выбор продавца</label><label><input type="checkbox" checked={selectedPosition?.store_selection_available ?? false} disabled />Доступен выбор магазина</label><label><input type="checkbox" checked={selectedPosition?.store_selection_required ?? false} disabled />Выбор магазина обязателен</label><label>Заблокирован до<input type="datetime-local" value={blocked} onChange={e=>setBlocked(e.target.value)} /></label><button type="button" onClick={()=>setPasswordOpen(true)}>Установить пароль</button>{password && <p>Новый пароль будет установлен при сохранении.</p>}</>}
 {error && <p role="alert" className="admin-error">{error}</p>}<div className="admin-actions"><button type="button" onClick={onClose}>Отмена</button><button className="primary" type="submit">{busy ? "Сохранение…" : "Сохранить"}</button></div></fieldset></form></Dialog>
 {passwordOpen && <PasswordDialog onClose={()=>setPasswordOpen(false)} onSet={value=>{setPassword(value);setPasswordOpen(false);}} />}</>;
}
function PasswordDialog({onClose,onSet}:{onClose:()=>void;onSet:(value:string)=>void}){
 const [password,setPassword]=useState("");const [repeat,setRepeat]=useState("");const [error,setError]=useState("");
 return <Dialog ariaLabel="Установить пароль" className="admin-dialog" onClose={onClose}><form onSubmit={e=>{e.preventDefault();if(password!==repeat){setError("Пароли не совпадают");return;}if(new TextEncoder().encode(password).length>72){setError("Пароль должен занимать не более 72 байт");return;}onSet(password);}}><label>Новый пароль<input type="password" autoComplete="new-password" required minLength={5} value={password} onChange={e=>setPassword(e.target.value)} /></label><label>Повторите пароль<input type="password" autoComplete="new-password" required value={repeat} onChange={e=>setRepeat(e.target.value)} /></label>{error && <p role="alert" className="admin-error">{error}</p>}<div className="admin-actions"><button type="button" onClick={onClose}>Отмена</button><button type="submit">Применить</button></div></form></Dialog>;
}
