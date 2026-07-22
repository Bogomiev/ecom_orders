"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Seller } from "@/entities/seller";
import {
  clearStoredCurrentSeller,
  getStoredCurrentSeller,
  setStoredCurrentSeller
} from "@/entities/seller";

function SellerModal({
  currentSeller,
  isOpen,
  onClose,
  onSelect
}: {
  currentSeller: Seller | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (seller: Seller) => void;
}) {
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedBarcode = barcode.trim();
    if (!normalizedBarcode || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        sellerBarcode: normalizedBarcode
      });
      const response = await fetch(`/api/entities/sellers?${searchParams}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Не удалось получить продавца");

      const data: unknown = await response.json();
      const sellers = Array.isArray(data)
        ? (data as Seller[])
        : data && typeof data === "object" && "data" in data && Array.isArray(data.data)
          ? (data.data as Seller[])
          : data && typeof data === "object" && "items" in data && Array.isArray(data.items)
            ? (data.items as Seller[])
            : [];

      if (sellers.length === 0) {
        setError("Продавец с таким штрихкодом не найден");
        inputRef.current?.select();
        return;
      }

      onSelect(sellers[0]);
      onClose();
    } catch {
      setError("Не удалось получить продавца. Попробуйте ещё раз");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-[1px]" onMouseDown={onClose}>
      <section aria-modal="true" className="relative w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
        <button aria-label="Закрыть" className="absolute right-5 top-3 flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" type="button" onClick={onClose}>×</button>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <input ref={inputRef} autoComplete="off" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" disabled={isLoading} inputMode="numeric" placeholder="Отсканируйте штрихкод на бедже" value={barcode} onChange={(event) => setBarcode(event.target.value)} />
          </label>

          {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}
          {isLoading ? <p className="text-sm font-medium text-blue-600">Ищем продавца...</p> : null}
        </form>
      </section>
    </div>
  );
}

export function SellerSelector() {
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentSeller(getStoredCurrentSeller());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleSelect(seller: Seller) {
    setCurrentSeller(seller);
    setStoredCurrentSeller(seller);
  }

  function handleLogout() {
    setCurrentSeller(null);
    clearStoredCurrentSeller();
  }

  return (
    <>
      <div className="relative min-w-48 rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50">
        <button className="flex min-h-12 w-full items-center justify-center px-8 py-2 text-center text-xs font-extrabold tracking-wide text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" type="button" onClick={() => setIsOpen(true)}>
          <span className="block max-w-full truncate">{currentSeller?.name ?? "<Продавец не указан>"}</span>
        </button>
        {currentSeller ? (
          <button
            aria-label="Выйти"
            className="group absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-base font-bold leading-none text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
            type="button"
            onClick={handleLogout}
          >
            ×
            <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium leading-none text-white shadow-md group-hover:block group-focus:block">
              Выйти
            </span>
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <SellerModal currentSeller={currentSeller} isOpen onClose={() => setIsOpen(false)} onSelect={handleSelect} />
      ) : null}
    </>
  );
}
