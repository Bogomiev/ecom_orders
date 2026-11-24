"use client";

import { useCallback } from "react";
import JsBarcode from "jsbarcode";
import { getBarcodeFormat } from "../../../shared/lib/barcode-format";
import { cardName, expandTags, priceParts, sheets, tagView, type PriceTagItem, type TagView } from "../model/price-tag-task";

// Price tag 60 × 47 mm from the approved specification «Ценник 60×47 мм — финальный вариант»: Impact price
// 18 mm squeezed to 0.85, name in Arial Narrow 3.7 mm, the regular price slot above the main price
// («цена БЕЗ КАРТЫ» or crossed out) and a 20 × 3.2 mm barcode with its digits. The dashed frame is the cut line.
// The small digits (barcode number, product code, date) are bold: regular 1.9 mm Arial prints too thin.
// A4 page: 3 columns × 6 rows edge to edge in the middle of the page (15 mm side margins, 7.5 mm top and
// bottom), so neighbouring tags share one cut line.
// The same CSS styles the preview and the print frame, so print is exactly what the preview shows.
// The fonts are served with the app (public/fonts/price-tag), so a tag prints the same on any computer: Anton for
// the price digits (Impact is a Windows font), Roboto Condensed Bold for the name, Arimo (Arial metrics) for the rest.
// Anton digits are taller and narrower than Impact ones: at 0.92 of the Impact size and without the 0.85 squeeze
// they are as high and about as wide as the specified squeezed Impact.
const priceTagFontFaces = `@font-face{font-family:"RMS Tag Price";src:url(/fonts/price-tag/anton-latin-400-normal.woff2) format("woff2");font-weight:400;font-style:normal;font-display:block;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"RMS Tag Name";src:url(/fonts/price-tag/roboto-condensed-latin-700-normal.woff2) format("woff2");font-weight:700;font-style:normal;font-display:block;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"RMS Tag Name";src:url(/fonts/price-tag/roboto-condensed-cyrillic-700-normal.woff2) format("woff2");font-weight:700;font-style:normal;font-display:block;unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"RMS Tag Text";src:url(/fonts/price-tag/arimo-latin-400-normal.woff2) format("woff2");font-weight:400;font-style:normal;font-display:block;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"RMS Tag Text";src:url(/fonts/price-tag/arimo-cyrillic-400-normal.woff2) format("woff2");font-weight:400;font-style:normal;font-display:block;unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"RMS Tag Text";src:url(/fonts/price-tag/arimo-latin-400-italic.woff2) format("woff2");font-weight:400;font-style:italic;font-display:block;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"RMS Tag Text";src:url(/fonts/price-tag/arimo-cyrillic-400-italic.woff2) format("woff2");font-weight:400;font-style:italic;font-display:block;unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"RMS Tag Text";src:url(/fonts/price-tag/arimo-latin-700-normal.woff2) format("woff2");font-weight:700;font-style:normal;font-display:block;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"RMS Tag Text";src:url(/fonts/price-tag/arimo-cyrillic-700-normal.woff2) format("woff2");font-weight:700;font-style:normal;font-display:block;unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"RMS Tag Text";src:url(/fonts/price-tag/arimo-latin-700-italic.woff2) format("woff2");font-weight:700;font-style:italic;font-display:block;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"RMS Tag Text";src:url(/fonts/price-tag/arimo-cyrillic-700-italic.woff2) format("woff2");font-weight:700;font-style:italic;font-display:block;unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}`;
export const priceTagSheetCss = `${priceTagFontFaces}
.pt-sheet{color:#141414}
.pt-sheet *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pt-sheet .pt-page{width:210mm;height:297mm;display:grid;grid-template-columns:repeat(3,60mm);grid-template-rows:repeat(6,47mm);justify-content:center;align-content:center;background:#fff;overflow:hidden;break-after:page}
.pt-sheet .pt-page:last-child{break-after:auto}
.pt-sheet .pt-wrap{background:#fff;border-right:0.3mm dashed #333;border-bottom:0.3mm dashed #333;width:60mm;height:47mm;position:relative;overflow:hidden;break-inside:avoid}
.pt-sheet .pt-wrap:nth-child(3n+1){border-left:0.3mm dashed #333}
.pt-sheet .pt-wrap:nth-child(-n+3){border-top:0.3mm dashed #333}
.pt-sheet .pt-tag{background:#fff;color:#141414;width:100%;height:100%;padding:1.7mm 2.2mm .8mm 2.2mm;display:flex;flex-direction:column;gap:0.3mm;font-family:"RMS Tag Text",Arial,Helvetica,sans-serif;position:relative}
.pt-sheet .pt-name{font-family:"RMS Tag Name","Arial Narrow","Roboto Condensed",Arial,sans-serif;font-weight:700;text-transform:uppercase;font-size:3.7mm;line-height:1.16;letter-spacing:-.01em}
.pt-sheet .pt-pricerow{margin-top:auto;display:flex;align-items:flex-start;justify-content:flex-end;gap:1.6mm;position:relative}
.pt-sheet .pt-old-wrap{position:absolute;left:0;bottom:100%;margin-bottom:2mm;line-height:0}
.pt-sheet .pt-old{display:inline-flex;align-items:flex-start;gap:0.3mm;font-family:"RMS Tag Price",Impact,sans-serif;font-size:7.8mm;font-weight:400;line-height:.89;font-variant-numeric:tabular-nums;word-spacing:-1mm;white-space:nowrap;position:relative}
.pt-sheet .pt-old sup{font-size:4.2mm;text-decoration:underline;font-weight:700;margin-top:0.5mm;font-family:"RMS Tag Text",Arial,sans-serif;line-height:1}
.pt-sheet .pt-old.diag::after{content:"";position:absolute;left:0;right:0;top:0;bottom:0;background:linear-gradient(to bottom right,transparent calc(50% - 0.25mm),#000 calc(50% - 0.25mm),#000 calc(50% + 0.25mm),transparent calc(50% + 0.25mm));pointer-events:none}
.pt-sheet .pt-oldcap{position:absolute;left:0;top:100%;margin-top:1mm;font-size:1.9mm;line-height:1.1;font-style:italic;white-space:nowrap}
.pt-sheet .pt-price{display:flex;align-items:stretch;gap:1mm}
.pt-sheet .pt-int{font-family:"RMS Tag Price",Impact,sans-serif;font-size:16.6mm;font-weight:400;line-height:.89;font-variant-numeric:tabular-nums;word-spacing:-2mm;white-space:nowrap}
.pt-sheet .pt-centcol{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;margin-top:0.2mm}
.pt-sheet .pt-cent{font-family:"RMS Tag Price",Impact,sans-serif;font-size:5.8mm;font-weight:400;text-decoration:underline;line-height:1}
.pt-sheet .pt-unit{font-size:2.1mm;font-weight:700;text-transform:uppercase;text-align:center;line-height:1.15}
.pt-sheet .pt-foot{display:flex;justify-content:space-between;align-items:stretch;font-size:1.9mm;margin-top:0.3mm}
.pt-sheet .pt-bc{display:flex;flex-direction:column;gap:0.3mm;min-height:5.6mm}
.pt-sheet .pt-bcnum{font-size:1.9mm;font-weight:700;line-height:1.1;white-space:nowrap}
.pt-sheet .pt-barcode{display:block;width:20mm;height:3.2mm}
.pt-sheet .pt-code{margin-top:auto;font-size:1.9mm;font-weight:700;line-height:1.1;white-space:nowrap}
.pt-sheet .pt-rcol{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end}
.pt-sheet .pt-card{font-style:italic;font-size:2mm;line-height:1.1;text-align:right}
.pt-sheet .pt-date{font-size:1.9mm;font-weight:700;line-height:1.1;margin-top:auto}
@media print{@page{size:A4 portrait;margin:0}html,body{margin:0;background:#fff}}`;

function Barcode({ value }: { value: string }) {
 const format = getBarcodeFormat(value);
 const render = useCallback((node: SVGSVGElement | null) => {
  if (!node || !format) return;
  JsBarcode(node, value, { format, displayValue: false, width: 1, height: 32, margin: 0, background: "#ffffff", lineColor: "#000000" });
  // JsBarcode sets pixel dimensions; the tag needs exactly 20 × 3.2 mm.
  node.removeAttribute("width");
  node.removeAttribute("height");
  node.setAttribute("preserveAspectRatio", "none");
 }, [value, format]);
 return format ? <svg ref={render} className="pt-barcode" role="img" aria-label={`Штрих-код ${value}`} /> : <span className="pt-barcode" />;
}

export function PriceTag({ tag, date }: { tag: TagView; date: string }) {
 const [integer, kopecks] = priceParts(tag.price);
 const old = tag.old === null ? null : priceParts(tag.old);
 return <div className="pt-wrap"><div className="pt-tag">
  <div className="pt-name">{tag.name}</div>
  <div className="pt-pricerow">
   {old && <div className="pt-old-wrap">
    <div className={`pt-old${tag.state === "promo" ? " diag" : ""}`}>{old[0]}<sup>{old[1]}</sup></div>
    {tag.state === "card" && <div className="pt-oldcap">цена <b>БЕЗ КАРТЫ</b></div>}
   </div>}
   <div className="pt-price"><span className="pt-int">{integer}</span><span className="pt-centcol"><span className="pt-cent">{kopecks}</span><span className="pt-unit">руб.<br />{tag.unit === "100 г" ? "100\u00a0г" : tag.unit}</span></span></div>
  </div>
  <div className="pt-foot">
   <div className="pt-bc">{tag.barcode ? <><div className="pt-bcnum">{tag.barcode}</div><Barcode value={tag.barcode} /></> : tag.code && <div className="pt-code">код {tag.code}</div>}</div>
   <div className="pt-rcol">{tag.state === "card" && <span className="pt-card">цена <b>С КАРТОЙ</b> «{cardName}»</span>}<span className="pt-date">{date}</span></div>
  </div>
 </div></div>;
}

export function PriceTagSheet({ items, date }: { items: PriceTagItem[]; date: string }) {
 return <div className="pt-sheet">{sheets(expandTags(items)).map((page, index) => <div key={index} className="pt-page" aria-label={`Лист ${index + 1}`}>
  {page.map(({ item, key }) => <PriceTag key={key} tag={tagView(item)} date={date} />)}
 </div>)}</div>;
}

// Prints the rendered sheet from a hidden iframe; done runs once, after the print dialog closes.
// Chrome fires afterprint; where it does not come, returning to the page counts as closing the dialog.
export function printPriceTagSheet(sheet: HTMLElement, done: (ok: boolean) => void) {
 const frame = document.createElement("iframe");
 frame.title = "Печать ценников";
 frame.style.cssText = "position:fixed;width:0;height:0;border:0";
 document.body.appendChild(frame);
 const doc = frame.contentDocument, target = frame.contentWindow;
 if (!doc || !target) { frame.remove(); done(false); return; }
 doc.open();
 doc.write(`<!doctype html><html lang="ru"><head><title></title><style>html{background:#fff;color-scheme:light}body{margin:0}${priceTagSheetCss}</style></head><body></body></html>`);
 doc.close();
 doc.title = "Ценники";
 doc.body.innerHTML = sheet.outerHTML;
 let finished = false;
 const finish = (ok: boolean) => { if (finished) return; finished = true; window.removeEventListener("focus", back); frame.remove(); done(ok); };
 const back = () => finish(true);
 target.addEventListener("afterprint", () => finish(true), { once: true });
 // The tag fonts load on first use: print only after they are there (a font that fails falls back to the system one).
 const fonts = ['400 10px "RMS Tag Price"', '700 10px "RMS Tag Name"', '400 10px "RMS Tag Text"', '700 10px "RMS Tag Text"', 'italic 400 10px "RMS Tag Text"', 'italic 700 10px "RMS Tag Text"'];
 void Promise.all(fonts.map(font => doc.fonts.load(font, "0Цц").catch(() => []))).then(() => doc.fonts.ready).then(() => {
  try { target.focus(); target.print(); window.addEventListener("focus", back, { once: true }); } catch { finish(false); }
 });
}
