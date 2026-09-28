"use client";

import { useCallback, useMemo } from "react";
import JsBarcode from "jsbarcode";
import { getBarcodeFormat } from "@/shared/lib/barcode-format";

export function ProductBarcode({ value }: { value?: string }) {
  const format = useMemo(() => getBarcodeFormat(value ?? ""), [value]);
  const renderBarcode = useCallback((node: SVGSVGElement | null) => {
    if (!node || !value || !format) return;
    JsBarcode(node, value, {
      format,
      displayValue: true,
      textPosition: "bottom",
      width: 2,
      height: 56,
      fontSize: 16,
      margin: 12,
      background: "#ffffff",
      lineColor: "#000000"
    });
  }, [value, format]);

  if (!format) return null;
  return <div className="max-w-full overflow-x-auto">
    <svg ref={renderBarcode} role="img" aria-label={`Штрихкод ${value}`} className="block max-w-none" />
  </div>;
}
