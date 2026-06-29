import type { ReactNode } from "react";

type PageShellProps = {
  children?: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="min-h-screen w-full px-4 pb-8 pt-3">
      {children}
    </main>
  );
}
