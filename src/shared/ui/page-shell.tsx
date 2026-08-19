import type { ReactNode } from "react";
import { NotificationPermissionPrompt } from "@/shared/ui/notification-permission-prompt";

type PageShellProps = {
  children?: ReactNode;
  className?: string;
};

export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <main className={`app-shell min-h-screen w-full pb-7 ${className}`}>
      {children}
      <NotificationPermissionPrompt />
    </main>
  );
}
