import type { ReactNode } from "react";

type WidgetPanelProps = {
  children?: ReactNode;
  className?: string;
  count?: number;
  description?: string;
  showHeader?: boolean;
  title?: string;
};

export function WidgetPanel({
  children,
  className = "",
  count,
  description,
  showHeader = true,
  title
}: WidgetPanelProps) {
  return (
    <section
      className={`flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm shadow-slate-300/60 lg:min-h-[32rem] xl:min-h-[calc(100vh-1.5rem)] ${className}`}
    >
      {showHeader ? (
        <header className="border-b border-slate-200 bg-slate-50/80 px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold uppercase tracking-normal text-slate-900">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-xs leading-snug text-slate-500">
                  {description}
                </p>
              ) : null}
            </div>
            {typeof count === "number" ? (
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm">
                {count}
              </span>
            ) : null}
          </div>
        </header>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </section>
  );
}
