"use client";

import type { GoodsReceipt } from "@/entities/goods-receipt";
import type { Product } from "@/entities/product";
import { Dialog } from "@/shared/ui/dialog";
import { formatNumber } from "@/features/orders/ui/order-control/order-control-shared";

export function GoodsReceiptView({ receipt, products, isConfirming, isPrinting, onClose }: {
  receipt: GoodsReceipt;
  products: Product[];
  isConfirming: boolean;
  isPrinting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPrint: () => void;
}) {
  const productsById = new Map(products.map((product) => [product.uid, product]));
  const busy = isConfirming || isPrinting;
  return (
    <Dialog ariaLabelledBy="goods-receipt-title" closeOnBackdrop={false} onClose={() => { if (!busy) onClose(); }} className="document-dialog relative mx-auto flex h-[min(650px,calc(100vh-32px))] w-[min(700px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl app-surface shadow-2xl">
      <div className="document-header flex flex-wrap items-start justify-between gap-3 border-b app-border px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <h2 id="goods-receipt-title" className="break-words text-lg font-bold app-text">Приемка {receipt.number}</h2>
          <p className="mt-1 break-words text-xs app-muted">Отправитель: {receipt.sender}</p>
          <p className="mt-1 break-words text-xs app-muted">Торговая точка: {receipt.shipment_store_name}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Закрыть" disabled={busy} onClick={onClose} className="h-9 w-9 rounded-lg border app-border text-lg app-text disabled:opacity-60">×</button>
        </div>
      </div>
      <div aria-busy={isConfirming} className="min-h-0 flex-1 overflow-auto">
        <p className="border-b app-border px-5 py-3 text-xs app-muted"><strong>Комментарий:</strong> <span className="whitespace-pre-wrap break-words">{receipt.comment || "—"}</span></p>
        <table className="document-lines w-full border-collapse text-left text-sm app-text">
          <thead className="sticky top-0 app-surface text-xs app-muted"><tr>
            <th className="px-5 py-3">Товар</th><th className="px-3 py-3 text-right">Количество</th>
          </tr></thead>
          <tbody>{receipt.items.map((item, index) => {
            const product = productsById.get(item.product_id);
            return <tr key={`${item.product_id}-${index}`} className="border-t app-border">
              <td className="px-5 py-3"><div className="font-bold">{product?.name ?? item.product_id}</div><div className="mt-1 text-xs app-muted">Код {product?.code ?? item.product_id}</div></td>
              <td data-label="Количество" className="px-3 py-3 text-right tabular-nums">{formatNumber(item.quantity)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </Dialog>
  );
}
