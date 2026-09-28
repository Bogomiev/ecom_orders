import JsBarcode from "jsbarcode";

export function isNumericBarcode(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

export function getBarcodeFormat(value: string): string | null {
  if (!isNumericBarcode(value)) return null;
  const retailFormat = /^\d{13}$/.test(value) ? "EAN13"
    : /^\d{8}$/.test(value) ? "EAN8"
    : /^\d{12}$/.test(value) ? "UPC" : null;
  for (const format of retailFormat ? [retailFormat, "CODE128"] : ["CODE128"]) {
    let valid = false;
    JsBarcode({}, value, { format, valid: (result) => { valid = result; } });
    if (valid) return format;
  }
  return null;
}

export function findDisplayBarcode(barcodes: readonly { barcode: string }[]): string | undefined {
  return barcodes.find((item) => getBarcodeFormat(item.barcode) !== null)?.barcode;
}
