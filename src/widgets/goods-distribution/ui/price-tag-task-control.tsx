"use client";

import { useCallback, useEffect, useState } from "react";
import { addPriceTagProduct, loadPriceTagProduct } from "@/entities/price-tag/api";
import { priceTagProductStatus, type PriceTagProductState } from "@/entities/price-tag/model";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { PriceTagTaskView } from "@/widgets/price-tag-task";

const printerIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9V3h12v6M6 14h12v7H6z" /><rect x="3" y="9" width="18" height="8" rx="2" /></svg>;

export type PriceTagProduct = { key: string; value: PriceTagProductState | null; error: string };

// The price tag of a product in the selected store: whether it waits in the «Печать ценников» task, the last
// print and the stopper on the shelf. reload asks RMS again, for example after the task window is closed.
export function usePriceTagProduct(storeId: string | undefined, productId: string) {
  const key = `${storeId ?? ""}/${productId}`;
  const [state, setState] = useState<PriceTagProduct>({ key: "", value: null, error: "" });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!storeId) return;
    let active = true;
    loadPriceTagProduct(storeId, productId)
      .then(value => { if (active) setState({ key: `${storeId}/${productId}`, value, error: "" }); })
      .catch(e => { if (active) setState({ key: `${storeId}/${productId}`, value: null, error: (e as Error).message }); });
    return () => { active = false; };
  }, [storeId, productId, version]);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  const current = state.key === key ? state : { key, value: null, error: "" };
  return { ...current, setState, reload };
}

// While the tag waits in the task the card offers only to show the task; otherwise it puts the product into
// the task (RMS opens the store's task when there is none yet) and says when the tag was printed last.
export function PriceTagTaskControl({ storeId, productId, tag }: { storeId?: string; productId: string; tag: ReturnType<typeof usePriceTagProduct> }) {
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<number | null>(null);
  const [error, setError] = useState("");
  const status = tag.value ? priceTagProductStatus(tag.value) : null;

  async function act() {
    if (!storeId || !tag.value) return;
    if (status?.queued && tag.value.task_id !== null) { setShown(tag.value.task_id); return; }
    setBusy(true);
    try { const value = await addPriceTagProduct(storeId, productId); tag.setState({ key: tag.key, value, error: "" }); setError(""); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="flex flex-col gap-2">
    {storeId && <div className="text-xs leading-5" role="status" aria-live="polite">
      {!tag.value && !tag.error ? <LoadingDots label="Загрузка ценника" /> : status?.printed ? <p className="app-muted">{status.printed}</p> : null}
      {(tag.error || error) && <p role="alert" className="text-red-600">{tag.error || error}</p>}
    </div>}
    <button type="button" onClick={() => void act()} disabled={!storeId || !tag.value || busy} title={storeId ? undefined : "Выберите магазин"}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs lg:text-sm font-semibold disabled:opacity-50 ${status?.queued ? "border-violet-500 bg-violet-600 text-white hover:bg-violet-700" : "app-border app-surface app-text"}`}>
      {busy ? <LoadingDots label="Формирование задания" /> : printerIcon}{status?.action ?? "Сформировать задание на печать ценника"}
    </button>
    {shown !== null && <PriceTagTaskView task_id={shown} onClose={() => { setShown(null); tag.reload(); }} />}
  </div>;
}
