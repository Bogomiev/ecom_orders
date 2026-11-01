"use client";

import { useRef, useState, useEffect } from "react";
import { Dialog } from "@/shared/ui/dialog";
import "./cash-collection.css";

export type CashCollectionProps = {
  qrCodeSrc: string;
  onClose: () => void;
};

export function CashCollection({ qrCodeSrc, onClose }: CashCollectionProps) {
  const printFrame = useRef<HTMLIFrameElement | null>(null);
  const [printError, setPrintError] = useState("");
  useEffect(() => () => { printFrame.current?.remove(); }, []);

  function printQrCode() {
    setPrintError("");
    printFrame.current?.remove();
    const frame = document.createElement("iframe");
    printFrame.current = frame;
    frame.title = "Печать QR-кода для инкассации";
    frame.style.cssText = "position:fixed;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const target = frame.contentWindow;
    const fail = () => { frame.remove(); setPrintError("Не удалось подготовить QR-код к печати. Попробуйте ещё раз."); };
    if (!doc || !target) { fail(); return; }
    doc.open();
    doc.write('<!doctype html><html lang="ru"><head><title>QR-код для инкассации</title><style>@page{margin:14mm}html{background:#fff;color:#000;color-scheme:light}body{margin:0;text-align:center}img{display:block;width:80mm;max-width:100%;height:auto;margin:0 auto;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;image-rendering:pixelated}</style></head><body></body></html>');
    doc.close();
    const image = doc.createElement("img");
    image.alt = "QR для авторизации";
    image.onload = () => {
      void doc.fonts.ready.then(() => {
        if (!frame.isConnected) return;
        try { target.focus(); target.print(); } catch { fail(); }
      });
    };
    image.onerror = fail;
    target.addEventListener("afterprint", () => frame.remove(), { once: true });
    image.src = qrCodeSrc;
    doc.body.appendChild(image);
  }

  return <Dialog ariaLabelledBy="cash-collection-title" onClose={onClose} className="cash-collection">
    <header className="cash-collection-head">
      <span className="cash-collection-dot" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18M3 7l2-3h14l2 3M5 7v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7M9 11h6" /></svg></span>
      <h2 id="cash-collection-title">Инкассация</h2>
      <button type="button" aria-label="Закрыть" className="cash-collection-close" onClick={onClose}>×</button>
    </header>
    <div className="cash-collection-body">
      <p className="cash-collection-lead">Чтобы заказать инкассацию, необходимо сформировать заявку, перейдя по ссылке. Система запросит логин и пароль.</p>
      <ol className="cash-collection-steps">
        <li>Нажмите кнопку «Создать заявку на инкассацию».</li>
        <li>На странице авторизации установите курсор в поле «Логин».</li>
        <li>Отсканируйте распечатанный QR-код — логин и пароль подставятся автоматически.</li>
      </ol>
      <a className="cash-collection-cta" href="https://encashment.sberbank.ru/" target="_blank" rel="noopener noreferrer">Создать заявку на инкассацию</a>
      <p className="cash-collection-hint">Ссылка откроется в новой вкладке: encashment.sberbank.ru</p>
      <hr className="cash-collection-sep" />
      <figure className="cash-collection-qr">
        {/* The caller supplies the QR image, which may also be a data URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCodeSrc} alt="QR для авторизации" />
      </figure>
      <div className="cash-collection-print-wrap"><button type="button" className="cash-collection-print" onClick={printQrCode}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>Распечатать QR-код</button></div>
      {printError ? <p role="alert" className="cash-collection-hint">{printError}</p> : null}
    </div>
  </Dialog>;
}
