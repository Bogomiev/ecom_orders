import type { ReactNode } from "react";
import { NotificationPermissionPrompt } from "@/shared/ui/notification-permission-prompt";

type PageShellProps = {
  children?: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="app-shell min-h-screen w-full pb-7">
      {children}
      <NotificationPermissionPrompt />
    </main>
  );
}
