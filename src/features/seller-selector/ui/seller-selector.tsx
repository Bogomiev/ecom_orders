"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Seller } from "@/entities/seller";
import {
  clearStoredCurrentSeller,
  setStoredCurrentSeller,
  useCurrentSeller
} from "@/entities/seller";
import { useIsStoreAuthorized } from "@/entities/store";
import { SellerBarcodeModal } from "./seller-barcode-modal";
import { SellerMenu } from "./seller-menu";
import { PersonalAccountDialog } from "./personal-account-dialog";

export function SellerSelector() {
  const currentSeller = useCurrentSeller();
  const isStoreAuthorized = useIsStoreAuthorized();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPersonalAccountOpen, setIsPersonalAccountOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  function handleSelect(seller: Seller) {
    setStoredCurrentSeller(seller);
  }

  const handleModalClose = useCallback(() => setIsModalOpen(false), []);

  function handleLogout() {
    setIsMenuOpen(false);
    clearStoredCurrentSeller();
  }

  function handleScanBadge() {
    if (!isStoreAuthorized) return;
    setIsMenuOpen(false);
    setIsModalOpen(true);
  }

  function handleOpenPersonalAccount() {
    setIsMenuOpen(false);
    setIsPersonalAccountOpen(true);
  }

  const initials = currentSeller?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "СА";

  return (
    <>
      <div ref={selectorRef} className="relative w-48 rounded-lg border app-border app-surface shadow-sm transition hover:bg-slate-50">
        <button aria-controls="seller-menu" aria-expanded={isMenuOpen} className="flex min-h-12 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left app-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" type="button" onClick={() => setIsMenuOpen((isOpen) => !isOpen)}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-500">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-extrabold leading-tight">
              {currentSeller?.name ?? "Продавец не указан"}
            </span>
            <span className={`mt-0.5 block text-[10px] font-semibold leading-tight ${currentSeller ? "text-green-600" : "app-muted"}`}>
              {currentSeller ? "Смена открыта" : "Смена не открыта"}
            </span>
          </span>
          <svg aria-hidden="true" className={`h-5 w-5 shrink-0 app-muted transition-transform ${isMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m8 10 4 4 4-4" />
          </svg>
        </button>
        {isMenuOpen ? (
          <SellerMenu
            canLogout={currentSeller !== null}
            canScanBadge={isStoreAuthorized}
            onLogout={handleLogout}
            onOpenPersonalAccount={handleOpenPersonalAccount}
            onScanBadge={handleScanBadge}
          />
        ) : null}
      </div>
      {isModalOpen ? (
        <SellerBarcodeModal onClose={handleModalClose} onSelect={handleSelect} />
      ) : null}
      {isPersonalAccountOpen ? (
        <PersonalAccountDialog onClose={() => setIsPersonalAccountOpen(false)} />
      ) : null}
    </>
  );
}
