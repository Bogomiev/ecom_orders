"use client";

import { useMemo, useRef, useState } from "react";
import type { Product } from "@/entities/product";
import { createBarcodeIndex } from "@/features/orders/model/scan-order";
import { HonestSignIcon } from "@/features/orders/ui/order-control/order-control-details-panel";
import { Dialog } from "@/shared/ui/dialog";
import {
  addReturnScan,
  canModifyReturn,
  isMarked,
  returnStatusLabel,
  type ReturnItem,
  type ReturnRequest,
  type ReturnStatus
} from "../model/return-request";

const tones: Record<ReturnStatus, string> = {
  NEW: "blue",
  SENT: "blue",
  PROCESSED: "blue",
  CANCELLED: "red",
  COMPLETED: "green"
};

const returnDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });
const quantity = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
const actionClass = "min-h-8 rounded-lg border app-border px-3 py-1 text-sm font-semibold app-text disabled:opacity-50";

export function formatReturnDate(date: string) {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? "—" : returnDate.format(value);
}

export function ReturnStatusPill({ status }: { status: ReturnStatus }) {
  return <span className={`order-status-pill order-status-${tones[status]} inline-flex min-h-7 items-center gap-2 rounded-full px-3 text-xs font-extrabold`}>
    <span className="status-dot h-2 w-2 rounded-full" aria-hidden="true" />{returnStatusLabel[status]}
  </span>;
}

export type ReturnDraft = ReturnRequest & { existing: boolean };

export function ReturnRequestView({ draft, products, pending, error, statusCheck, canSave, onResume, onClose, onSave, onCancel }: {
  draft: ReturnDraft;
  products: Product[];
  pending: string | null;
  error: string | null;
  statusCheck: "checking" | "confirmed" | "failed";
  canSave: boolean;
  onResume: () => void;
  onClose: () => void;
  onSave: (items: ReturnItem[]) => void;
  onCancel: () => void;
}) {
  const [editedItems, setItems] = useState<ReturnItem[] | null>(null);
  const items = editedItems ?? draft.items;
  const [barcode, setBarcode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ text: string; apply: () => void } | null>(null);
  const scanner = useRef<HTMLInputElement>(null);
  const index = useMemo(() => createBarcodeIndex(products), [products]);
  const productsById = useMemo(() => new Map(products.map((product) => [product.uid, product])), [products]);
  const dirty = editedItems !== null;
  const canModify = canModifyReturn(draft.status);
  const actionsDisabled = Boolean(pending) || statusCheck !== "confirmed";

  function close() {
    if (pending) return;
    if (dirty) setConfirm({ text: "Отменить изменения?", apply: onClose });
    else onClose();
  }

  function scan() {
    if (!barcode.trim() || pending) return;
    try {
      setItems(addReturnScan(items, index, barcode));
      setScanError(null);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Не удалось обработать код");
    }
    setBarcode("");
    scanner.current?.focus();
  }

  function changeQuantity(item: ReturnItem, step: number) {
    setItems(items.map((row) => row === item ? { ...row, amount: Math.round((row.amount + step) * 1000) / 1000 } : row));
  }

  return (
    <Dialog ariaLabel="Заявка на возврат" className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl app-surface shadow-xl" onClose={close}>
      <header className="order-card-header flex flex-wrap items-start justify-between gap-3 border-b app-border p-4">
        <div>
          <h2 className="text-lg font-extrabold app-text">{draft.number ? `Заявка № ${draft.number}` : "Заявка на возврат"}</h2>
          <div className="mt-1 text-sm app-muted">{formatReturnDate(draft.date)}</div>
        </div>
        <div className="flex items-center gap-2">
          <ReturnStatusPill status={draft.status} />
          <button type="button" aria-label="Закрыть заявку" className={actionClass} disabled={Boolean(pending)} onClick={close}>×</button>
        </div>
      </header>
      <div className="overflow-y-auto p-4">
        {statusCheck === "checking" && <p role="status" className="mb-2 text-sm app-muted">Проверяем статус заявки в RMS…</p>}
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); scan(); }}>
          <label className="min-w-40 flex-1 text-sm font-semibold app-text">
            Штрихкод или марка
            <input ref={scanner} autoFocus className="mt-1 block min-h-10 w-full rounded-lg border app-border app-surface-muted px-3 app-text" autoComplete="off" value={barcode} disabled={Boolean(pending)} onChange={(event) => setBarcode(event.target.value)} />
          </label>
          <button type="submit" className={actionClass} disabled={Boolean(pending) || !barcode.trim()}>Добавить товар</button>
        </form>
        {scanError && <p role="alert" className="mt-2 text-sm text-red-600">{scanError}</p>}
        <table className="mt-4 w-full text-left text-sm app-text">
          <thead><tr className="border-b app-border text-xs app-muted"><th className="py-2">Товар</th><th className="py-2 text-right">Количество</th><th><span className="sr-only">Действия</span></th></tr></thead>
          <tbody>
            {items.map((item) => {
              const product = productsById.get(item.product_id);
              const name = product?.name ?? item.product_id;
              const marked = isMarked(product) || Boolean(item.marks?.length);
              const manual = !marked && !product?.isWeight;
              return <tr key={item.product_id} className="border-b app-border">
                <td className="py-2 pr-2 font-semibold">
                  <div className="flex items-start gap-2.5">
                    {marked && <HonestSignIcon />}
                    <span className="min-w-0 break-words">{name}</span>
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-end gap-2">
                    {manual && <button type="button" aria-label={`Уменьшить количество: ${name}`} className={actionClass} disabled={Boolean(pending) || item.amount <= 1} onClick={() => changeQuantity(item, -1)}>−</button>}
                    <span className="whitespace-nowrap font-bold tabular-nums">{quantity.format(item.amount)}</span>
                    {manual && <button type="button" aria-label={`Увеличить количество: ${name}`} className={actionClass} disabled={Boolean(pending)} onClick={() => changeQuantity(item, 1)}>+</button>}
                  </div>
                </td>
                <td className="py-2 pl-2 text-right"><button type="button" aria-label={`Удалить строку: ${name}`} className={actionClass} disabled={Boolean(pending)} onClick={() => setConfirm({
                  text: "Удалить строку?",
                  apply: () => setItems((current) => (current ?? items).filter((row) => row.product_id !== item.product_id))
                })}>×</button></td>
              </tr>;
            })}
          </tbody>
        </table>
        {items.length === 0 && <p className="py-3 text-sm app-muted">В заявке пока нет товаров</p>}
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t app-border p-4">
        {draft.existing && canModify && <button type="button" className={actionClass} disabled={actionsDisabled} onClick={() => setConfirm({ text: "Отменить заявку?", apply: onCancel })}>Отменить заявку</button>}
        {draft.status === "CANCELLED" && !canSave && <button type="button" className={actionClass} disabled={actionsDisabled} onClick={onResume}>Возобновить</button>}
        <button type="button" className="order-primary-button rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={actionsDisabled || !canSave || items.length === 0} onClick={() => onSave(items)}>Сохранить и отправить</button>
      </footer>
      {pending && <div role="status" className="absolute inset-0 z-10 grid place-items-center bg-slate-950/35"><div className="rounded-xl app-surface px-5 py-3 shadow-lg"><span className="text-sm font-semibold app-text">{pending}…</span></div></div>}
      {confirm && <Dialog ariaLabel={confirm.text} className="w-full max-w-xs rounded-xl app-surface p-4 shadow-xl" onClose={() => setConfirm(null)}>
        <h3 className="font-bold app-text">{confirm.text}</h3>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={actionClass} onClick={() => setConfirm(null)}>Нет</button>
          <button type="button" className={actionClass} onClick={() => { setConfirm(null); confirm.apply(); }}>Да</button>
        </div>
      </Dialog>}
    </Dialog>
  );
}
