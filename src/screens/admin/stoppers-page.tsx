"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, getCurrentUser, logout, restoreSession } from "@/shared/api/auth";
import { canManageStoppers, isStopperManagerOnly } from "@/shared/lib/permissions";
import { useTheme } from "@/shared/lib/use-theme";
import { StopperManager } from "./stopper-manager";
import "./admin.css";

type Access = "loading" | "error" | "denied" | "manager" | "admin" | "out";
function access(): Access {
 const user = getCurrentUser();
 return !canManageStoppers(user) ? "denied" : isStopperManagerOnly(user) ? "manager" : "admin";
}

// Stopper management for the manager role (admins may open it too); a manager sees nothing else.
export function StoppersPage() {
 useTheme();
 const [state, setState] = useState<Access>("loading");
 const [retry, setRetry] = useState(0);
 const [leaving, setLeaving] = useState(false);
 useEffect(() => {
  let active = true;
  const changed = () => { if (active) setState(access()); };
  window.addEventListener(AUTH_CHANGED_EVENT, changed);
  window.addEventListener("storage", changed);
  restoreSession().then(session => { if (active) setState(session ? access() : "denied"); }).catch(() => { if (active) setState("error"); });
  return () => { active = false; window.removeEventListener(AUTH_CHANGED_EVENT, changed); window.removeEventListener("storage", changed); };
 }, [retry]);
 const name = state === "manager" || state === "admin" ? getCurrentUser()?.name : "";
 async function signOut() {
  setLeaving(true);
  try { await logout(); } finally { setLeaving(false); setState("out"); }
 }
 return <main className="admin-page"><header className="admin-header"><div><p className="admin-eyebrow">МОЙ МАГАЗИН</p><h1>Управление стопперами</h1></div><div className="admin-account">{state === "admin" && <Link href="/">← На главную</Link>}{name && <span className="admin-user">{name}</span>}{(state === "manager" || state === "admin") && <button type="button" className="admin-logout" disabled={leaving} onClick={() => void signOut()}>{leaving ? "Выход…" : "Выйти"}</button>}</div></header>
  {state === "loading" ? <p role="status">Проверяем доступ…</p>
   : state === "error" ? <div role="alert">Не удалось проверить сессию. <button onClick={() => { setState("loading"); setRetry(retry + 1); }}>Повторить</button></div>
   : state === "out" ? <section className="admin-panel"><h2>Вы вышли из аккаунта</h2><p>Чтобы войти снова, откройте ссылку с токеном и введите PIN.</p></section>
   : state === "denied" ? <section className="admin-panel"><h2>Доступ ограничен</h2><p>Откройте сервис по ссылке с токеном пользователя с ролью manager и введите PIN.</p></section>
   : <StopperManager />}
 </main>;
}
