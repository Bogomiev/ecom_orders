export function SellerMenu({
  canLogout,
  onLogout,
  onOpenPersonalAccount,
  onScanBadge
}: {
  canLogout: boolean;
  onLogout: () => void;
  onOpenPersonalAccount: () => void;
  onScanBadge: () => void;
}) {
  return (
    <div id="seller-menu" className="absolute left-0 top-[calc(100%+6px)] z-40 w-[235px] overflow-hidden rounded-xl border app-border app-surface p-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
      <button className="flex h-9 w-full items-center gap-3 rounded-lg px-1.5 text-left text-[13px] font-bold app-text transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none" type="button" onClick={onScanBadge}>
        <svg aria-hidden="true" className="h-5 w-5 shrink-0 app-muted" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" viewBox="0 0 24 24">
          <path d="M4 5v14M7 5v14M11 5v14M15 5v14M18 5v14M21 5v14" />
        </svg>
        Отсканировать бейдж
      </button>
      <button className="flex h-9 w-full items-center gap-3 rounded-lg px-1.5 text-left text-[13px] font-bold app-text transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none" type="button" onClick={onOpenPersonalAccount}>
        <svg aria-hidden="true" className="h-5 w-5 shrink-0 app-muted" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
          <circle cx="12" cy="7" r="3.25" />
          <path d="M5.5 20v-2.25A5.75 5.75 0 0 1 11.25 12h1.5a5.75 5.75 0 0 1 5.75 5.75V20" />
        </svg>
        Личный кабинет
      </button>
      <div className="my-2 border-t app-border" />
      <button className="flex h-9 w-full items-center gap-3 rounded-lg px-1.5 text-left text-[13px] font-bold text-red-600 transition hover:bg-red-50 focus:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent" disabled={!canLogout} type="button" onClick={onLogout}>
        <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
          <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10" />
        </svg>
        Выйти из профиля
      </button>
    </div>
  );
}
