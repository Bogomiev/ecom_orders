"use client";

import { useEffect, useRef, useState } from "react";
import { useOrderHistoryDays } from "@/entities/order";
import type { Product } from "@/entities/product";
import { getStoredCurrentSeller } from "@/entities/seller";
import { usePageNotifications } from "@/shared/lib/use-page-notifications";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { PageNotificationStack } from "@/shared/ui/page-notification";
import { Dialog } from "@/shared/ui/dialog";
import { ORDERS_REFRESH_INTERVAL_SECONDS } from "@/widgets/orders-list/api/orders";
import { useProductsCache } from "@/widgets/orders-list/model/use-products-cache";
import { cancelReturnRequest, fetchReturnList, fetchReturnRequest, fetchReturnRequestStatus, saveReturnRequest } from "../api/return-request";
import { canModifyReturn, returnStatusLabel, type ReturnItem, type ReturnList, type ReturnStatus } from "../model/return-request";
import { formatReturnDate, ReturnRequestView, ReturnStatusPill, type ReturnDraft } from "./return-request-view";

const buttonClass = "min-h-8 rounded-lg border app-border px-3 py-1 text-xs font-extrabold app-text disabled:opacity-50";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось выполнить операцию";
}

export function ReturnRequests({ storeId }: { storeId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState(false);
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<ReturnList | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReturnDraft | null>(null);
  const [resumed, setResumed] = useState(false);
  const [statusCheck, setStatusCheck] = useState<"checking" | "confirmed" | "failed">("confirmed");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [cancelID, setCancelID] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const busy = useRef(false);
  const listVersion = useRef(0);
  const { getProducts } = useProductsCache();
  const { notifications, notify, dismiss } = usePageNotifications();
  const configuredDays = useOrderHistoryDays();
  const days = history ? -configuredDays : 0;

  useEffect(() => {
    if (!storeId) return;
    const controller = new AbortController();
    let loading = false;
    async function load(store: string) {
      if (loading) return;
      loading = true;
      const version = listVersion.current;
      try {
        const result = await fetchReturnList(store, days, controller.signal);
        if (!controller.signal.aborted && version === listVersion.current) {
          setList(result);
          setListError(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) setListError(errorText(error));
      } finally {
        loading = false;
      }
    }
    void load(storeId);
    const timer = window.setInterval(() => void load(storeId), ORDERS_REFRESH_INTERVAL_SECONDS * 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [storeId, days, revision]);

  const openRequestID = draft?.existing ? draft.id : undefined;
  useEffect(() => {
    if (!storeId || !openRequestID) return;
    const controller = new AbortController();
    let loading = false;
    let confirmed = false;

    function updateCard(status: ReturnStatus) {
      setList((current) => current && {
        ...current,
        items: current.items.map((item) => item.id === openRequestID ? { ...item, status } : item)
      });
    }

    async function refresh(store: string, id: string) {
      if (loading || busy.current) return;
      loading = true;
      try {
        if (!confirmed) {
          setStatusCheck("checking");
          setStatusError(null);
          const { status } = await fetchReturnRequestStatus(store, id, controller.signal);
          if (controller.signal.aborted) return;
          setDraft((current) => current?.id === id ? { ...current, status } : current);
          listVersion.current += 1;
          updateCard(status);
          confirmed = true;
          setStatusCheck("confirmed");
          return;
        }
        const request = await fetchReturnRequest(store, id, controller.signal);
        if (!controller.signal.aborted && !busy.current) {
          setDraft((current) => current?.id === request.id ? { ...request, existing: true } : current);
          updateCard(request.status);
        }
      } catch (error) {
        if (!confirmed && !controller.signal.aborted) {
          setStatusCheck("failed");
          setStatusError(errorText(error));
        }
      } finally {
        loading = false;
      }
    }

    void refresh(storeId, openRequestID);
    const timer = window.setInterval(() => void refresh(storeId, openRequestID), ORDERS_REFRESH_INTERVAL_SECONDS * 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [storeId, openRequestID]);

  async function run(label: string, work: () => Promise<void>, inEditor = false) {
    if (busy.current) return;
    busy.current = true;
    setPending(label);
    setOperationError(null);
    try {
      await work();
    } catch (error) {
      if (inEditor) setOperationError(errorText(error));
      else notify({ title: "Заявка на возврат", body: errorText(error), tone: "warning" });
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  function open(id?: string) {
    if (!storeId) return;
    void run("Загрузка заявки", async () => {
      const [catalog, request] = await Promise.all([getProducts(), id ? fetchReturnRequest(storeId, id) : null]);
      setProducts(catalog);
      setStatusCheck(request ? "checking" : "confirmed");
      setStatusError(null);
      setResumed(false);
      setDraft(request ? { ...request, existing: true } : {
        id: crypto.randomUUID(), number: null, date: new Date().toISOString(), status: "NEW",
        item_count: 0, items: [], existing: false
      });
    });
  }

  const canSave = Boolean(draft && (canModifyReturn(draft.status) || (draft.status === "CANCELLED" && resumed)));

  function save(items: ReturnItem[]) {
    if (!draft || !storeId || statusCheck !== "confirmed" || !canSave) return;
    void run("Сохранение заявки", async () => {
      const seller = getStoredCurrentSeller();
      if (!seller) throw new Error("Выберите продавца и отсканируйте штрихкод на бейдже");
      const result = await saveReturnRequest(storeId, draft.id, draft.existing, seller.userId, items);
      setDraft(null);
      setRevision((value) => value + 1);
      notify({ title: result.number ? `Заявка № ${result.number}` : "Заявка на возврат", body: returnStatusLabel[result.status], tone: "success" });
    }, true);
  }

  function cancel(id: string) {
    if (!storeId || (draft?.id === id && (statusCheck !== "confirmed" || !canModifyReturn(draft.status)))) return;
    void run("Отмена заявки в 1С", async () => {
      const result = await cancelReturnRequest(storeId, id);
      setDraft(null);
      setRevision((value) => value + 1);
      notify({ title: result.number ? `Заявка № ${result.number}` : "Заявка на возврат", body: returnStatusLabel[result.status], tone: result.status === "CANCELLED" ? "success" : "warning" });
    }, Boolean(draft));
  }

  const openCard = draft?.existing ? draft : null;
  const cards = list?.items ?? [];
  const visibleCards = openCard && !cards.some((item) => item.id === openCard.id) ? [...cards, openCard] : cards;

  return <section className="mt-3 min-h-0 rounded-xl border app-border app-surface-muted">
    <div className="flex items-center gap-2 pr-3">
      <button type="button" aria-expanded={expanded} aria-controls="return-request-list" disabled={Boolean(pending)} onClick={() => setExpanded(!expanded)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-extrabold app-text focus:ring-2 focus:ring-teal-400">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="m8 5-5 5 5 5M3 10h12a5 5 0 0 1 0 10h-4" /></svg>
        </span>
        <span>Заявка на возврат</span>
      </button>
      <button type="button" aria-label={history ? "Скрыть историю заявок" : "Показать историю заявок"} title={`История за ${configuredDays} дн.`}
        aria-pressed={history} disabled={!storeId || Boolean(pending)} onClick={() => setHistory(!history)}
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${history ? "border-blue-600 bg-blue-600 text-white" : "app-border app-muted"}`}>
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5m4-1v5l3 2" /></svg>
      </button>
      <button type="button" aria-label={expanded ? "Свернуть заявки" : "Развернуть заявки"} aria-expanded={expanded} aria-controls="return-request-list" disabled={Boolean(pending)}
        className="flex shrink-0 items-center gap-2 text-sm font-extrabold app-text" onClick={() => setExpanded(!expanded)}>
        <span className="grid h-8 min-w-8 place-items-center rounded-full bg-indigo-100 text-xs font-black text-indigo-600">{list?.totalItems ?? 0}</span>
        <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
      </button>
    </div>
    <div id="return-request-list" hidden={!expanded} className="space-y-3 px-3 pb-3">
      {storeId ? <button type="button" className={buttonClass} disabled={Boolean(pending)} onClick={() => open()}>Добавить заявку</button>
        : <p className="text-sm app-muted">Выберите торговую точку</p>}
      {storeId && !list && !listError && <LoadingDots label="Загрузка заявок" />}
      {listError && <p role="alert" className="text-sm text-red-600">{listError}</p>}
      {list && visibleCards.length === 0 && <p className="text-sm app-muted">Нет заявок на возврат</p>}
      {visibleCards.map((item) => {
        const isOpen = openCard?.id === item.id;
        const status = isOpen ? openCard.status : item.status;
        return <article key={item.id} className="rounded-xl app-surface p-2.5 shadow-[0_2px_8px_rgb(0_0_0/12%)]">
          <div className="order-card-header flex flex-wrap items-center justify-between gap-2">
            <strong className="break-all text-xs app-text">{item.number ? `№ ${item.number}` : "Без номера"}</strong>
            <span className="text-xs app-muted">{formatReturnDate(item.date)}</span>
          </div>
          <div className="mt-2"><ReturnStatusPill status={status} /></div>
          <div className="order-card-meta mt-2"><span className="order-meta-label">Позиций</span><strong className="order-meta-value">{item.item_count}</strong></div>
          <div className="order-card-actions mt-3 flex gap-2 border-t app-border pt-3">
            {canModifyReturn(status) && <button type="button" className={buttonClass} disabled={Boolean(pending) || (isOpen && statusCheck !== "confirmed")} onClick={() => setCancelID(item.id)}>Отмена</button>}
            <button type="button" className="order-primary-button min-h-8 flex-1 rounded-lg bg-emerald-600 text-xs font-extrabold text-white disabled:opacity-50" disabled={Boolean(pending)} onClick={() => open(item.id)}>Открыть заявку</button>
          </div>
        </article>;
      })}
    </div>
    {draft && <ReturnRequestView draft={draft} products={products} pending={pending} error={operationError ?? statusError} statusCheck={statusCheck}
      canSave={canSave} onResume={() => setResumed(true)}
      onClose={() => { if (!busy.current) setDraft(null); }} onSave={save} onCancel={() => cancel(draft.id)} />}
    {!draft && pending && <Dialog ariaLabel={pending} className="rounded-xl app-surface p-5 shadow-xl" closeOnBackdrop={false} onClose={() => {}}><p role="status" className="text-sm font-semibold app-text">{pending}…</p></Dialog>}
    {cancelID && <Dialog ariaLabel="Отменить заявку?" className="w-full max-w-xs rounded-xl app-surface p-4 shadow-xl" onClose={() => setCancelID(null)}>
      <h3 className="font-bold app-text">Отменить заявку?</h3>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={buttonClass} onClick={() => setCancelID(null)}>Нет</button>
        <button type="button" className={buttonClass} onClick={() => { setCancelID(null); cancel(cancelID); }}>Да</button>
      </div>
    </Dialog>}
    <PageNotificationStack notifications={notifications} onClose={dismiss} />
  </section>;
}
