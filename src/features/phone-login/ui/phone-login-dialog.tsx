"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { createLoginCode, loginCodeURL } from "@/shared/api/auth";
import { Dialog } from "@/shared/ui/dialog";
import { LoadingDots } from "@/shared/ui/loading-dots";

type Code = { image: string; deadline: number };

// The QR code holds a one-time login link; it is drawn here, so the code never leaves the browser except to RMS.
async function issueCode(storeID: string | null): Promise<Code> {
  const v = await createLoginCode(storeID ?? undefined);
  const svg = await QRCode.toString(loginCodeURL(window.location.origin, v.code), { type: "svg", errorCorrectionLevel: "M", margin: 2 });
  return { image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, deadline: Date.now() + v.expiresIn * 1000 };
}

function formatLeft(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Shows a QR code that opens the service on a phone signed in as the same user and in the same store.
export function PhoneLoginDialog({ storeID, storeName, onClose }: { storeID: string | null; storeName: string | null; onClose: () => void }) {
  const [code, setCode] = useState<Code | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let active = true;
    issueCode(storeID)
      .then((v) => { if (active) { setCode(v); setNow(Date.now()); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Не удалось создать QR-код"); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [storeID]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  async function renew() {
    setBusy(true);
    setError("");
    try {
      setCode(await issueCode(storeID));
      setNow(Date.now());
    } catch (e) {
      setCode(null);
      setError(e instanceof Error ? e.message : "Не удалось создать QR-код");
    } finally {
      setBusy(false);
    }
  }
  const left = code ? Math.max(0, Math.ceil((code.deadline - now) / 1000)) : 0;
  const expired = code !== null && left === 0;
  return (
    <Dialog ariaLabelledBy="phone-login-title" className="w-full max-w-sm max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl app-surface shadow-2xl" onClose={onClose}>
      <div className="flex items-center justify-between border-b app-border px-5 py-4">
        <h2 id="phone-login-title" className="text-lg font-extrabold">Вход с телефона</h2>
        <button aria-label="Закрыть" className="h-9 w-9 rounded-lg border app-border app-surface-muted text-lg" type="button" onClick={onClose}>×</button>
      </div>
      <div className="flex flex-col items-center gap-3 px-5 py-5 text-center text-sm">
        <p>Наведите камеру телефона на QR-код: сервис откроется сразу под вашим именем{storeName ? <> в магазине <b>{storeName}</b></> : null}, без токена и PIN.</p>
        <div className="relative grid h-60 w-60 place-items-center rounded-xl border app-border bg-white p-2">
          {code ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={code.image} alt="QR-код для входа с телефона" width={224} height={224} className={`h-56 w-56 ${expired ? "opacity-10 blur-sm" : ""}`} />
          ) : busy ? <span role="status" className="text-slate-600"><LoadingDots /></span> : null}
          {expired ? <span className="absolute font-extrabold text-slate-900">Код истёк</span> : null}
        </div>
        {error ? <p role="alert" className="text-red-600">{error}</p> : null}
        {code && !expired ? <p aria-live="polite">Действует ещё <b className="tabular-nums">{formatLeft(left)}</b> и только для одного входа.</p> : null}
        {(expired || (error && !busy)) ? (
          <button type="button" className="rounded-lg border app-border app-surface-muted px-4 py-2 font-bold" disabled={busy} onClick={() => void renew()}>Новый QR-код</button>
        ) : null}
        <p className="app-muted text-xs">Не показывайте код посторонним и не пересылайте его фото: пока код действует, по нему можно войти под вашей учётной записью.</p>
      </div>
    </Dialog>
  );
}
