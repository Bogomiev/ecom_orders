"use client";

import { Dialog } from "@/shared/ui/dialog";
import "./contacts.css";

type ContactItem = { label: string; phone: string } | { hint: string };
type ContactNote = { text: string; tone?: "urgent" | "request" };
type ContactGroup = { id: string; title: string; intro?: string; items: ContactItem[]; notes?: ContactNote[] };

// Contact details and wording supplied in the mobile/tablet mockups.
const groups: ContactGroup[] = [
  {
    id: "management", title: "Руководство", intro: "Территориальный управляющий — уточняется на месте",
    items: [
      { label: "Руководитель розничной сети — Дмитрий Петрик", phone: "+7 (925) 991-71-03" },
      { label: "Директор по продажам — Ольга Зяблицкая", phone: "+7 (915) 152-70-70" },
      { label: "Коммерческий директор — Алексей Петрухин", phone: "+7 (960) 197-88-77" }
    ],
    notes: [{ text: "Проверки (налоговая, Роспотребнадзор, МВД, пожарные), пожар, потоп, залив, драка, кража, любое ЧП — 24/7, звоните сразу" }]
  },
  {
    id: "technical", title: "Техническая служба",
    items: [
      { label: "Менеджер — Владимир Брижанев", phone: "+7 (995) 922-58-09" },
      { label: "Руководитель службы — Юрий Зяблицкий", phone: "+7 (926) 116-02-59" }
    ],
    notes: [
      { tone: "urgent", text: "Срочно (24/7) — холодильники, морозильники, кондиционеры, отключение света. Норма −22…−24°С (не теплее −18°С), икорный −0…−4°С — уход в плюс = авария." },
      { tone: "request", text: "Несрочно (ручка, ценникодержатель, лампа и т.п.) — заявка в Сервис Деск" }
    ]
  },
  {
    id: "it", title: "ИТ",
    items: [
      { label: "ИТ-оборудование, Интернет, Кассовая программа, 1С — ИТ-Таргет (09:00–22:00)", phone: "+7 (495) 539-26-14" },
      { label: "Учебный портал (доступ, помощь) — Леонид Карасев", phone: "+7 (925) 543-39-28" }
    ],
    notes: [
      { tone: "urgent", text: "Срочно — не работают касса, интернет, нет возможности нормального обслуживания покупателей" },
      { tone: "request", text: "Несрочно — заявка в Сервис Деск, срок до 7 раб. дней" }
    ]
  },
  {
    id: "goods", title: "Товар и заказы",
    items: [
      { label: "Товароведы (перемещения, возвраты, некондиция, уценка)", phone: "+7 (926) 000-39-32" },
      { hint: "Основные / доп. заказы — своему менеджеру:" },
      { label: "Лукиных Виктория", phone: "+7 (929) 983-93-87" },
      { label: "Мельник Снежана", phone: "+7 (925) 543-31-38" },
      { label: "Мазурова Светлана", phone: "+7 (925) 386-92-86" }
    ]
  },
  {
    id: "orders", title: "Интернет-заказы",
    items: [
      { label: "Агрегаторы доставки (Яндекс, Купер) — Анастасия Елисеева", phone: "+7 (925) 330-95-84" },
      { label: "Интернет-магазин (сайт, мобильное приложение, ОЗОН)", phone: "+7 (495) 744-39-53" }
    ]
  }
];

function ContactSymbol({ type }: { type: "warning" | "clipboard" | "phone" | "print" }) {
  const paths = {
    warning: <><path d="m12 3 10 18H2Z" /><path d="M12 9v4M12 17h.01" /></>,
    clipboard: <><rect x="4" y="4" width="16" height="18" rx="2" /><rect x="8" y="2" width="8" height="4" rx="1" /></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z" />,
    print: <><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7ZM17 11h.01" /></>
  };
  return <svg aria-hidden="true" className="contacts-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

function Phone({ phone }: { phone: string }) {
  return <a className="contacts-phone" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>;
}

function ContactRow({ label, phone }: { label: string; phone: string }) {
  return <div className="contacts-row"><span>{label}</span><Phone phone={phone} /></div>;
}

export function ContactsDialog({ onClose }: { onClose: () => void }) {
  return <Dialog ariaLabelledBy="contacts-title" onClose={onClose} className="contacts-dialog">
    <header className="contacts-header">
      <div className="contacts-heading"><h2 id="contacts-title">Контакты</h2><p>Магазины «Икорный» — быстрый доступ</p></div>
      <div className="contacts-actions">
        <button type="button" className="contacts-print-button" onClick={() => window.print()}><ContactSymbol type="print" />Печать памятки</button>
        <button type="button" aria-label="Закрыть" className="contacts-close-button" onClick={onClose}>×</button>
      </div>
    </header>
    <div className="contacts-scroll">
      <div className="contacts-grid">
        {groups.map(({ id, title, intro, items, notes }) => <section key={id} aria-labelledby={`contacts-${id}-title`} className={`contacts-card contacts-${id}`}>
          <h3 id={`contacts-${id}-title`}>{title}</h3>
          {intro ? <p className="contacts-intro">{intro}</p> : null}
          {items.map((item, index) => "hint" in item ? <p key={index} className="contacts-hint">{item.hint}</p> : <ContactRow key={item.phone} {...item} />)}
          {notes?.map(({ text, tone }) => <div key={text} className={`contacts-note ${tone ? `contacts-note-${tone}` : "contacts-note-plain"}`}><ContactSymbol type={tone === "request" ? "clipboard" : "warning"} /><p>{text}</p></div>)}
        </section>)}
        <div className="contacts-extra-card">
          <section className="contacts-card" aria-labelledby="contacts-loyalty-title">
            <h3 id="contacts-loyalty-title">Программа лояльности — Премиум Бонус</h3>
            <div className="contacts-row contacts-chat-row"><span>Акции, баллы, регистрация покупателей (чат в MAX)</span><strong>«Икорный &amp; Премиум Бонус»</strong></div>
          </section>
          <section className="contacts-card" aria-labelledby="contacts-standards-title">
            <h3 id="contacts-standards-title">Стандарты обслуживания</h3>
            <ContactRow label="Специалист — Елена Зеляк" phone="+7 (967) 028-22-87" />
            <p className="contacts-hint">Открытие/закрытие, форма, выкладка, тайный покупатель, фотоотчёт</p>
          </section>
        </div>
      </div>
      <div className="contacts-reminders">
        <div className="contacts-note contacts-note-urgent"><ContactSymbol type="phone" /><p>Срочно — звоните и пишите в MAX</p></div>
        <div className="contacts-note contacts-note-request"><ContactSymbol type="clipboard" /><p>Несрочно — заявка в Сервис Деск</p></div>
      </div>
      <footer className="contacts-hotline">
        <div><ContactSymbol type="phone" /><span>Горячая линия для посетителей</span></div>
        <Phone phone="+7 (495) 744-39-53" />
      </footer>
    </div>
  </Dialog>;
}
