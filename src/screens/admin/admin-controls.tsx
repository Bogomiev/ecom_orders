"use client";

import type { ComponentProps, FormEvent, ReactNode } from "react";
import { Dialog } from "@/shared/ui/dialog";

export function AdminDialog({ children, closeDisabled, title, actions, ...props }: ComponentProps<typeof Dialog> & { closeDisabled?: boolean; title?: ReactNode; actions?: ReactNode }) {
  return <Dialog {...props}>
    <header className="admin-dialog-header">
      <div className="admin-dialog-heading"><h2>{title ?? props.ariaLabel}</h2>{actions && <div className="admin-actions admin-dialog-actions">{actions}</div>}</div>
      <button type="button" className="admin-close" aria-label="Закрыть" title="Закрыть" disabled={closeDisabled} onClick={props.onClose}>×</button>
    </header>
    <div className="admin-dialog-body">{children}</div>
  </Dialog>;
}

export function RefreshButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="admin-icon-button" title="Обновить" aria-label="Обновить" disabled={disabled} onClick={onClick}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 17.9 17" /></svg></button>;
}

export function SaveActions({ form, busy }: { form: string; busy: boolean }) {
  return <><button className="primary" type="submit" form={form} name="action" value="save-close" disabled={busy}>Сохранить и закрыть</button><button type="submit" form={form} name="action" value="save" disabled={busy}>{busy ? "Сохранение…" : "Сохранить"}</button></>;
}

export function shouldCloseAfterSave(event: FormEvent) {
  return (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "save-close";
}
