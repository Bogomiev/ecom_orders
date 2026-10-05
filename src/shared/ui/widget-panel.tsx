import Link from "next/link";
import type { ReactNode } from "react";

type WidgetIconName = "cart" | "chart" | "check" | "cube" | "message";

type WidgetPanelProps = {
  accent?: "blue" | "cyan" | "orange" | "purple" | "teal";
  children?: ReactNode;
  className?: string;
  count?: number;
  description?: string;
  icon?: WidgetIconName;
  headerAction?: ReactNode;
  instructionsHref?: string;
  showHeader?: boolean;
  title?: string;
};

export function WidgetIcon({ name }: { name: WidgetIconName }) {
  const paths: Record<WidgetIconName, ReactNode> = {
    cart: (
      <>
        <path d="M3 4h2l1.7 9.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L20 7H6" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="17" cy="19" r="1" />
      </>
    ),
    cube: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12v9" />
      </>
    ),
    check: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="m8 12 2.5 2.5L16.5 9" />
      </>
    ),
    message: (
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V7a2 2 0 0 1 2-2Z" />
    ),
    chart: (
      <>
        <path d="M4 20V5" />
        <path d="M4 20h16" />
        <path d="m7 15 4-4 3 2 5-6" />
      </>
    )
  };

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

export function WidgetPanel({
  accent = "blue",
  children,
  className = "",
  count,
  description,
  icon,
  headerAction,
  instructionsHref,
  showHeader = true,
  title
}: WidgetPanelProps) {
  return (
    <section
      className={`widget-panel widget-accent-${accent} relative flex min-w-0 flex-col self-start overflow-hidden rounded-2xl border app-border app-surface shadow-sm ${className}`}
    >
      {showHeader ? (
        <header className="widget-header relative min-h-16 border-b app-border px-3.5 py-3">
          <div className="widget-accent-line" />
          <div className="flex items-center gap-3">
            {icon ? (
              <span className="widget-icon grid h-8 w-8 shrink-0 place-items-center rounded-lg">
                <WidgetIcon name={icon} />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-extrabold leading-snug">{title}</h2>
              {description ? (
                <p className="mt-0.5 truncate text-xs leading-snug">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="widget-header-actions ml-auto flex shrink-0 items-center gap-2">
              {headerAction}
              {instructionsHref ? <Link href={instructionsHref} aria-label={`Инструкции: ${title}`} title={`Инструкции: ${title}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border app-border app-surface-muted app-muted transition hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v16h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4Z" /><path d="M8 8v8l8-8v8" /></svg>
              </Link> : null}
              {typeof count === "number" ? (
                <span className="widget-count grid h-8 min-w-8 place-items-center rounded-full text-xs font-black">
                  {count}
                </span>
              ) : null}
            </div>
          </div>
        </header>
      ) : null}
      <div className="widget-content flex-1 p-3">{children}</div>
    </section>
  );
}
