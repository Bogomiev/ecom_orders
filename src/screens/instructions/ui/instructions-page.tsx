"use client";

import Link from "next/link";
import { ServiceInstructions } from "@/features/service-instructions";
import { useTheme } from "@/shared/lib/use-theme";
import { PageShell } from "@/shared/ui/page-shell";

export function InstructionsPage() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <PageShell>
      <header className="top-header flex min-h-[4.5rem] items-center justify-between gap-4 border-b app-border app-surface px-3 py-2">
        <Link className="flex min-w-0 items-center gap-3 rounded-lg app-text focus:outline-none focus:ring-2 focus:ring-blue-500" href="/">
          <span className="header-icon-button grid h-9 w-9 place-items-center rounded-lg border app-border app-surface-muted">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </span>
          <span className="truncate text-sm font-extrabold">На главный экран</span>
        </Link>
        <button
          aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
          className="header-icon-button grid h-9 w-9 place-items-center rounded-lg border app-border app-surface-muted"
          type="button"
          onClick={toggleTheme}
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" />
            {isDark ? <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2" /> : <path d="M12 4a8 8 0 0 0 0 16V4Z" fill="currentColor" stroke="none" />}
          </svg>
        </button>
      </header>
      <ServiceInstructions />
    </PageShell>
  );
}
