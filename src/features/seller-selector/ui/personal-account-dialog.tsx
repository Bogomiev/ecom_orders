"use client";

import { useOrderHistoryDays, setStoredOrderHistoryDays } from "@/entities/order";
import { Dialog } from "@/shared/ui/dialog";

export function PersonalAccountDialog({ onClose }: { onClose: () => void }) {
  const historyDays = useOrderHistoryDays();

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

      <div className="border-b app-border px-5 pt-3">
        <button
          aria-selected="true"
          className="border-b-2 border-blue-600 px-1 pb-3 text-sm font-bold text-blue-600"
          role="tab"
          type="button"
        >
          Настройки
        </button>
      </div>

      <div className="px-5 py-6" role="tabpanel">
        <label className="flex flex-wrap items-center gap-2 text-sm font-medium app-text" htmlFor="order-history-days">
          <span>Отображать выданные и отмененные заказы</span>
          <input
            id="order-history-days"
            aria-label="Количество дней отображения истории заказов"
            className="h-9 w-20 rounded-lg border app-border app-surface-muted px-2 text-center font-bold tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            inputMode="numeric"
            min="1"
            step="1"
            type="number"
            value={historyDays}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (Number.isFinite(value) && value >= 1) {
                setStoredOrderHistoryDays(value);
              }
            }}
          />
          <span>дней</span>
        </label>
      </div>
    </Dialog>
  );
}
