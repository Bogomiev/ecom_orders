"use client";

import { useState } from "react";
import { WidgetPanel } from "@/shared/ui/widget-panel";
import { ContactsDialog } from "./contacts-dialog";
import { ContactsIcon } from "./contacts-icon";

export function ServiceDesk() {
  const [contactsOpen, setContactsOpen] = useState(false);
  return <>
    <WidgetPanel accent="orange" count={0} description="Обращения поддержки" icon="message" title="Сервис-деск">
      <button type="button" aria-haspopup="dialog" className="flex w-full items-center gap-3 rounded-xl border app-border app-surface-muted px-3 py-3 text-left text-sm font-extrabold app-text transition hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400" onClick={() => setContactsOpen(true)}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-700"><ContactsIcon /></span>
        <span>Контакты</span>
      </button>
    </WidgetPanel>
    {contactsOpen ? <ContactsDialog onClose={() => setContactsOpen(false)} /> : null}
  </>;
}
