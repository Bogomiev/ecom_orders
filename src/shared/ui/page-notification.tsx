export type PageNotificationTone = "error" | "info" | "success" | "warning";

export type PageNotification = {
  id: string;
  body: ReactNode;
  title: string;
  tone?: PageNotificationTone;
};

type PageNotificationStackProps = {
  notifications: PageNotification[];
  onClose: (id: string) => void;
};

const toneClassByTone: Record<PageNotificationTone, string> = {
  error: "border-red-200/80 bg-red-50/95 text-red-950",
  info: "border-sky-200/80 bg-sky-50/95 text-sky-950",
  success: "border-emerald-200/80 bg-emerald-50/95 text-emerald-950",
  warning: "border-amber-200/80 bg-amber-50/95 text-amber-950"
};

function PageNotificationItem({
  notification,
  onClose
}: {
  notification: PageNotification;
  onClose: (id: string) => void;
}) {
  const toneClass = toneClassByTone[notification.tone ?? "info"];

  return (
    <div
      className={`pointer-events-auto rounded-3xl border px-4 py-3 shadow-2xl backdrop-blur ${toneClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-sm font-black">
          {notification.tone === "error" ? "×" : "!"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold leading-5">
            {notification.title}
          </div>
          <div className="mt-1 whitespace-pre-line text-sm leading-5 opacity-85">
            {notification.body}
          </div>
        </div>
        <button
          aria-label="Закрыть"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-base font-semibold"
          type="button"
          onClick={() => onClose(notification.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function PageNotificationStack({
  notifications,
  onClose
}: PageNotificationStackProps) {
  if (notifications.length === 0) {
    return null;
  }

  const importantNotifications = notifications.filter(
    ({ tone }) => tone === "error" || tone === "warning"
  );
  const informationalNotifications = notifications.filter(
    ({ tone }) => tone !== "error" && tone !== "warning"
  );

  const renderNotifications = (items: PageNotification[]) =>
    items.map((notification) => (
      <PageNotificationItem
        key={notification.id}
        notification={notification}
        onClose={onClose}
      />
    ));

  return (
    <>
      {importantNotifications.length > 0 ? (
        <div className="pointer-events-none fixed left-1/2 top-[15vh] z-[100] flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 flex-col gap-3">
          {renderNotifications(importantNotifications)}
        </div>
      ) : null}
      {informationalNotifications.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-3 top-20 z-[100] flex flex-col gap-3 sm:left-auto sm:right-4 sm:top-4 sm:w-full sm:max-w-md">
          {renderNotifications(informationalNotifications)}
        </div>
      ) : null}
    </>
  );
}
import type { ReactNode } from "react";
