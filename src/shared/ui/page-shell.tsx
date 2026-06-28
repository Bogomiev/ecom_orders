import type { ReactNode } from "react";

type PageShellProps = {
  children?: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8">
      {children}
    </main>
  );
}
