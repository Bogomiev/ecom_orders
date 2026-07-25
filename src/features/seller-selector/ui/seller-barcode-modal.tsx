"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Seller } from "@/entities/seller";
import { findSellerByBarcode } from "@/entities/seller/api/find-seller";
import { Dialog } from "@/shared/ui/dialog";

export function SellerBarcodeModal({
  onClose,
  onSelect
}: {
  onClose: () => void;
  onSelect: (seller: Seller) => void;
}) {
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedBarcode = barcode.trim();
    if (!normalizedBarcode || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const seller = await findSellerByBarcode(normalizedBarcode);
      if (seller === null) {
        setError("Продавец с таким штрихкодом не найден");
        inputRef.current?.select();
        return;
      }
      onSelect(seller);
      onClose();
    } catch {
      setError("Не удалось получить продавца. Попробуйте ещё раз");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      ariaLabel="Сканирование бейджа продавца"
      className="relative w-full max-w-md rounded-[2rem] app-surface p-6 shadow-2xl sm:p-8"
      onClose={onClose}
    >
      <button aria-label="Закрыть" className="absolute right-5 top-3 flex h-9 w-9 items-center justify-center rounded-full text-2xl app-muted hover:bg-slate-100 hover:text-slate-700" type="button" onClick={onClose}>×</button>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <input ref={inputRef} autoFocus autoComplete="off" className="h-12 w-full rounded-xl border app-border app-surface-muted px-4 text-base app-text outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" disabled={isLoading} inputMode="numeric" placeholder="Отсканируйте штрихкод на бейдже" value={barcode} onChange={(event) => setBarcode(event.target.value)} />
        {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}
        {isLoading ? <p className="text-sm font-medium text-blue-600">Ищем продавца...</p> : null}
      </form>
    </Dialog>
  );
}
