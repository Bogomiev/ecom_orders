"use client";

import { useCurrentSeller } from "@/entities/seller";
import { Dialog } from "@/shared/ui/dialog";

export function PersonalAccountDialog({ onClose }: { onClose: () => void }) {
  const seller = useCurrentSeller();

  return (
    <Dialog
      ariaLabelledBy="personal-account-title"
      className="w-full max-w-lg overflow-hidden rounded-2xl app-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b app-border px-5 py-4">
        <h2 id="personal-account-title" className="text-lg font-extrabold app-text">
          Личный кабинет
        </h2>
        <button
          aria-label="Закрыть"
          className="grid h-9 w-9 place-items-center rounded-lg border app-border app-surface-muted text-lg app-muted transition hover:bg-slate-200 hover:text-slate-900"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="px-5 py-6 text-sm app-text">
        {seller?.name ?? "Продавец не указан"}
      </div>
    </Dialog>
  );
}
