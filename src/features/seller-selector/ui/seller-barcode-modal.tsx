"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { normalizeSellerBarcode, type Seller } from "@/entities/seller";
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

  const focusBarcodeInput = useCallback(() => {
    const input = inputRef.current;
    if (input === null || input.disabled) return;
    input.focus();
    input.select();
  }, []);

  useEffect(() => {
    // The dialog is rendered through a portal. Focus once more on the next
    // frame so that it cannot remain on the button which opened the dialog.
    const frameId = requestAnimationFrame(focusBarcodeInput);
    return () => cancelAnimationFrame(frameId);
  }, [focusBarcodeInput]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedBarcode = normalizeSellerBarcode(barcode).trim();
    if (!normalizedBarcode || isLoading) return;
    setIsLoading(true);
    setError(null);

    let shouldRestoreFocus = false;

    try {
      const seller = await findSellerByBarcode(normalizedBarcode);
      if (seller === null) {
        setError("Продавец с таким штрихкодом не найден");
        shouldRestoreFocus = true;
        return;
      }
      onSelect(seller);
      onClose();
    } catch {
      setError("Не удалось получить продавца. Попробуйте ещё раз");
      shouldRestoreFocus = true;
    } finally {
      setIsLoading(false);
      if (shouldRestoreFocus) {
        requestAnimationFrame(focusBarcodeInput);
      }
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
        <input ref={inputRef} autoFocus autoCapitalize="none" autoComplete="off" className="h-12 w-full rounded-xl border app-border app-surface-muted px-4 text-base app-text outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" disabled={isLoading} lang="en" placeholder="Отсканируйте штрихкод на бейдже" spellCheck={false} value={barcode} onChange={(event) => { setBarcode(normalizeSellerBarcode(event.target.value)); setError(null); }} />
        {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}
        {isLoading ? <p className="text-sm font-medium text-blue-600">Ищем продавца...</p> : null}
      </form>
    </Dialog>
  );
}
