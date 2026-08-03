"use client";

import { useEffect, useMemo, useRef } from "react";
import { Dialog } from "./dialog";

type PdfDialogProps = {
  base64: string;
  onClose: () => void;
  title?: string;
};

function createPdfUrl(base64: string) {
  const normalized = base64
    .replace(/^data:application\/pdf;base64,/i, "")
    .replace(/\s/g, "");
  const bytes = Uint8Array.from(atob(normalized), (character) =>
    character.charCodeAt(0)
  );
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

export function PdfDialog({
  base64,
  onClose,
  title = "Просмотр PDF"
}: PdfDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pdfUrl = useMemo(() => createPdfUrl(base64), [base64]);

  useEffect(() => {
    return () => URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  function handlePrint() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <Dialog
      ariaLabelledBy="pdf-dialog-title"
      className="flex h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl app-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-3 border-b app-border px-4 py-3">
        <h2 id="pdf-dialog-title" className="text-base font-extrabold">
          {title}
        </h2>
        <button
          aria-label="Закрыть"
          className="grid size-10 place-items-center rounded-lg text-2xl font-bold hover:bg-slate-500/10"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 bg-slate-200">
        <iframe
          ref={iframeRef}
          className="h-full w-full border-0"
          src={pdfUrl}
          title={title}
        />
      </div>

      <div className="flex justify-end border-t app-border px-4 py-3">
        <button
          className="min-h-10 rounded-lg bg-blue-600 px-6 text-sm font-extrabold text-white hover:bg-blue-700"
          type="button"
          onClick={handlePrint}
        >
          Печать
        </button>
      </div>
    </Dialog>
  );
}
