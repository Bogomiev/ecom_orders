"use client";

import { useEffect, useRef, useState } from "react";
import type { GoodsReceipt } from "@/entities/goods-receipt";
import type { Product } from "@/entities/product";
import { getStoredCurrentSeller } from "@/entities/seller";
import { useIsStoreAuthorized, useSelectedStore } from "@/entities/store";
import { formatMoney } from "@/features/orders/ui/order-control/order-control-shared";
import { usePageNotifications } from "@/shared/lib/use-page-notifications";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { PageNotificationStack } from "@/shared/ui/page-notification";
import { PdfDialog } from "@/shared/ui/pdf-dialog";
import { useProductsCache } from "@/widgets/orders-list/model/use-products-cache";
import { confirmInvoice, printInvoice } from "../api/goods-receipts";
import { useGoodsReceipts } from "../model/use-goods-receipts";
import { GoodsReceiptView } from "./goods-receipt-view";

export function GoodsReceipts() {
  const store = useSelectedStore();
  const authorized = useIsStoreAuthorized();
  const storeId = authorized ? store?.id : undefined;
  return <GoodsReceiptsService key={storeId ?? "unauthorized"} storeId={storeId} />;
}

function GoodsReceiptsService({ storeId }: { storeId?: string }) {
  const { data, error, isLoading, refresh } = useGoodsReceipts(storeId);
  const [expanded, setExpanded] = useState(false);
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pending, setPending] = useState<"opening" | "confirming" | "printing" | null>(null);
  const [pdf, setPdf] = useState<{ base64: string; title: string } | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const { getProducts } = useProductsCache();
  const { notifications, notify, dismiss } = usePageNotifications();
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function reportError(error: unknown) {
    if (mounted.current) notify({ title: "Приемка", body: error instanceof Error ? error.message : "Не удалось получить ответ сервера", tone: "warning" });
  }

  async function openReceipt(value: GoodsReceipt) {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending("opening");
    try {
      const loaded = await getProducts();
      if (mounted.current) {
        setProducts(loaded);
        setReceipt(value);
      }
    } catch (error) {
      reportError(error);
    } finally {
      busyRef.current = false;
      if (mounted.current) setPending(null);
    }
  }

  async function acceptReceipt() {
    if (!receipt || busyRef.current) return;
    const seller = getStoredCurrentSeller();
    if (!seller) {
      notify({ title: "Приемка", body: "Выберите сотрудника для принятия документа", tone: "warning" });
      return;
    }
    busyRef.current = true;
    setPending("confirming");
    try {
      const result = await confirmInvoice({ invoiceId: receipt.id, seller: seller.userId });
      if (!mounted.current) return;
      const succeeded = result.status === 200;
      notify({ title: "Приемка", body: succeeded ? "Документ успешно принят" : `Не удалось принять документ: ${result.data.mess}`, tone: succeeded ? "success" : "warning" });
      await refresh();
      if (mounted.current && succeeded) setReceipt(null);
    } catch (error) {
      reportError(error);
    } finally {
      busyRef.current = false;
      if (mounted.current) setPending(null);
    }
  }

  async function printReceipt() {
    if (!receipt || busyRef.current) return;
    busyRef.current = true;
    setPending("printing");
    try {
      const base64 = await printInvoice(receipt.id);
      if (mounted.current) setPdf({ base64, title: `Приемка ${receipt.number}` });
    } catch (error) {
      reportError(error);
    } finally {
      busyRef.current = false;
      if (mounted.current) setPending(null);
    }
  }

  return (
    <section className="mt-3 min-h-0">
      <button type="button" aria-expanded={expanded} aria-controls="goods-receipts-list" disabled={pending !== null} onClick={() => setExpanded((value) => !value)} className="flex w-full items-center gap-3 rounded-xl border app-border app-surface-muted px-3 py-3 text-left text-sm font-extrabold app-text transition hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-60">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700">↓</span>
        <span className="flex-1">Приемка</span>
        <span className="grid h-8 min-w-8 place-items-center rounded-full bg-indigo-100 text-xs font-black text-indigo-600">{data?.totalItems ?? 0}</span>
        <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
      </button>
      <div id="goods-receipts-list" hidden={!expanded} className="mt-3 space-y-3">
        {!storeId ? <p className="text-sm app-muted">Выберите торговую точку</p> : null}
        {isLoading || pending === "opening" ? <LoadingDots label="Загрузка приемок" /> : null}
        {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
        {data?.items.length === 0 ? <p className="text-sm app-muted">Нет приходов</p> : null}
        {data?.items.map((item) => <article key={item.id} className="order-full-card order-full-card-blue w-full rounded-xl border-2 border-blue-500 app-surface-muted p-2.5">
          <div className="order-card-header flex items-center gap-2.5">
            <button type="button" disabled={pending !== null} onClick={() => void openReceipt(item)} className="min-w-0 flex-1 break-words text-left text-xs font-semibold app-text hover:underline">{item.number} ↗</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="order-status-pill order-status-blue inline-flex min-h-7 items-center gap-2 rounded-full px-3 text-xs font-extrabold"><span className="status-dot h-2 w-2 rounded-full" />Новый</span>
            <span className="delivery-badge inline-flex min-h-7 items-center rounded-md border app-border app-surface px-2.5 text-xs font-extrabold">{item.type === "RECEIPT" ? "Приобретение" : (item.type === "ACCEPTANCE_ON_CONSIGNMENT" ? "Прием на комиссию" : "Перемещение")}</span>
          </div>
          <div className="mt-1 font-semibold text-xs app-text">{item.sender || "—"}</div>
          <div className="order-card-meta mt-2 grid grid-cols-2 gap-2">
            <div><span className="order-meta-label">Позиций</span><strong className="order-meta-value">{item.items.length}</strong></div>
            <div><span className="order-meta-label">Сумма</span><strong className="order-meta-value">{formatMoney(item.amount)} ₽</strong></div>
          </div>
          <div className="order-card-actions mt-3 border-t app-border pt-3"><button type="button" disabled={pending !== null} onClick={() => void openReceipt(item)} className="order-primary-button min-h-[2.125rem] w-full rounded-lg bg-emerald-600 text-xs font-extrabold text-white disabled:opacity-60">Открыть приемку</button></div>
        </article>)}
      </div>
      {receipt ? <GoodsReceiptView receipt={receipt} products={products} isConfirming={pending === "confirming"} isPrinting={pending === "printing"} onClose={() => { if (!busyRef.current) setReceipt(null); }} onConfirm={() => void acceptReceipt()} onPrint={() => void printReceipt()} /> : null}
      {pdf ? <PdfDialog {...pdf} onClose={() => setPdf(null)} /> : null}
      <PageNotificationStack notifications={notifications} onClose={dismiss} />
    </section>
  );
}
