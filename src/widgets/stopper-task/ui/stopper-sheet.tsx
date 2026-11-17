"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import JsBarcode from "jsbarcode";
import { getBarcodeFormat } from "@/shared/lib/barcode-format";
import { formatStopperPrice, storageMode } from "@/entities/stopper/model";
import { formatDayMonth, formatStock, groupStopperTaskItems, paginate, type StopperTaskItem } from "../model/stopper-task";

// The A4 sheet is printed from an iframe, so its styles travel with it as plain CSS.
export const stopperSheetCss = `.stopper-sheet{color:#000;width:210mm;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.15}
.stopper-sheet .page{position:relative;width:210mm;height:297mm;padding:7mm;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.18);margin-bottom:18px;overflow:hidden;box-sizing:border-box}
.stopper-sheet .pglabel{font-size:11.5px;font-weight:600;color:#5a6478;margin:0 0 6px 2px}
.stopper-sheet table{width:100%;border-collapse:collapse}
.stopper-sheet thead tr{height:5mm}.stopper-sheet tbody tr{height:8mm}
.stopper-sheet th{text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.03em;border-bottom:1.5px solid #000;padding:2px 4px}
.stopper-sheet th.r{text-align:right}
.stopper-sheet td{border-bottom:1px solid #bbb;padding:0 4px;vertical-align:middle}
.stopper-sheet tr.blank td{border-right:1px dotted #c8c8c8}.stopper-sheet tr.blank td:last-child{border-right:0}
.stopper-sheet tr.gs td{border-top:1.5px solid #000}.stopper-sheet tbody tr.gs:first-child td{border-top:0}
.stopper-sheet .n{width:16px;color:#555;font-size:9px}
.stopper-sheet .mi{width:12px;padding:0 2px;font-size:11px;text-align:center}
.stopper-sheet .nm{max-width:250px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.stopper-sheet .nm b{font-size:10.5px;font-weight:700}.stopper-sheet .nm span{font-family:monospace;font-size:8.5px;color:#555}
.stopper-sheet .bc{width:108px;padding:1px 2px}.stopper-sheet .bc svg{display:block;width:104px;height:27.6px}
.stopper-sheet .bc span{font-family:monospace;font-size:8.5px}
.stopper-sheet .stp{display:inline-block;border:1px solid #000;border-radius:2px;padding:0 4px;font-weight:700;font-size:9px;white-space:nowrap}
.stopper-sheet .stp.x{text-decoration:line-through}
.stopper-sheet .pr{text-align:right;white-space:nowrap;width:52px;font-size:10px}.stopper-sheet .pr b{font-size:11px}
.stopper-sheet .st{text-align:right;white-space:nowrap;width:36px;font-size:9.5px}
.stopper-sheet .task{white-space:nowrap;font-size:9.5px;width:66px}.stopper-sheet .task.rm{font-weight:700}.stopper-sheet .task small{font-weight:400;font-size:8.5px}
.stopper-sheet .box{width:18px}.stopper-sheet .box i{display:block;width:12px;height:12px;border:1.2px solid #000;margin:0 auto}
@media print{@page{size:A4 portrait;margin:0}body{margin:0}.stopper-sheet .pglabel{display:none}.stopper-sheet .page{box-shadow:none;margin:0;break-after:page}.stopper-sheet .page:last-child{break-after:auto}.stopper-sheet tr{break-inside:avoid}}`;

function SheetBarcode({ value }: { value: string }) {
 const format = useMemo(() => getBarcodeFormat(value), [value]);
 const render = useCallback((node: SVGSVGElement | null) => {
  if (!node || !format) return;
  JsBarcode(node, value, { format, displayValue: true, width: 1, height: 20, fontSize: 9, textMargin: 0, margin: 0, background: "#ffffff", lineColor: "#000000" });
 }, [value, format]);
 return format ? <svg ref={render} role="img" aria-label={`Штрих-код ${value}`} /> : <span>{value}</span>;
}

// Rows go by thermal mode: refrigerators and freezers first, then the shelf; ended stoppers come first in every group.
export function StopperSheet({ check, remove }: { check: StopperTaskItem[]; remove: StopperTaskItem[] }) {
 // A thick line separates thermal-mode groups on the sheet.
 const lines = groupStopperTaskItems(check, remove).flatMap(group => [...group.remove, ...group.check].map((item, index) => ({ item, thermal: group.thermal, first: index === 0 })));
 const rows: ReactNode[] = lines.map(({ item: v, thermal, first }, index) => {
  const mode = storageMode(thermal);
  const icon = <td className="mi" title={`${mode.label} · ${mode.place}`}>{mode.icon}</td>;
  const prices = v.remove || !v.promo_price ? <><td className="pr" /><td className="pr"><b>{formatStopperPrice(v.price)}</b></td></> : <><td className="pr">{formatStopperPrice(v.price)}</td><td className="pr"><b>{formatStopperPrice(v.promo_price)}</b></td></>;
  return <tr key={`${v.remove ? "rm" : "ch"}-${v.doc_id}-${v.product_id}`} className={first ? "gs" : undefined}><td className="n">{index + 1}</td>{icon}<td className="nm"><b>{v.name}</b> <span>{v.code}</span></td><td className="bc"><SheetBarcode value={v.barcode} /></td><td><span className={`stp${v.remove ? " x" : ""}`}>{v.stopper}</span></td>{prices}<td className="st">{formatStock(v)}</td>
   {v.remove ? <td className="task rm">Снять {v.to && <small>до {formatDayMonth(v.to)}</small>}</td> : <td className="task">{v.result === "bad" ? "Ценник" : "Проверить"}</td>}<td className="box"><i /></td></tr>;
 });
 const pages = paginate(rows);
 const head = <thead><tr><th>№</th><th /><th>Товар</th><th>Штрих-код</th><th>Стоппер</th><th className="r">Рег.</th><th className="r">Акц.</th><th className="r">Ост.</th><th>Задача</th><th>✓</th></tr></thead>;
 return <div className="stopper-sheet">{pages.map((part, index) => {
  const empty = Math.max(0, part.length ? 34 - part.length : 34);
  return <div key={index}><div className="pglabel">Лист {index + 1} из {pages.length} · A4, 210 × 297 мм{empty > 0 && ` · пустых строк: ${empty}`}</div>
   <div className="page"><table>{head}<tbody>{part}{Array.from({ length: empty }, (_, i) => <tr key={`blank-${i}`} className="blank"><td className="n" /><td className="mi" /><td className="nm" /><td className="bc" /><td /><td className="pr" /><td className="pr" /><td className="st" /><td className="task" /><td className="box"><i /></td></tr>)}</tbody></table></div></div>;
 })}</div>;
}

// Prints the rendered sheet from a hidden iframe so the page around the dialog stays out of print.
export function printStopperSheet(sheet: HTMLElement, title: string, onError: () => void) {
 const frame = document.createElement("iframe");
 frame.title = title;
 frame.style.cssText = "position:fixed;width:0;height:0;border:0";
 document.body.appendChild(frame);
 const doc = frame.contentDocument, target = frame.contentWindow;
 if (!doc || !target) { frame.remove(); onError(); return; }
 doc.open();
 doc.write(`<!doctype html><html lang="ru"><head><title></title><style>html{background:#fff;color-scheme:light}${stopperSheetCss}</style></head><body></body></html>`);
 doc.close();
 doc.title = title;
 doc.body.innerHTML = sheet.outerHTML;
 target.addEventListener("afterprint", () => frame.remove(), { once: true });
 try { target.focus(); target.print(); } catch { frame.remove(); onError(); }
}
