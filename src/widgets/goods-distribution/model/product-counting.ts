import type { Product } from "@/entities/product";
import {
  createBarcodeIndex,
  parseScannedCode
} from "../../../features/orders/model/scan-order";

export const PRODUCT_COUNTING_STORAGE_KEY = "ecom-orders-product-counting";

export type ProductCountingLine = {
  productCode: string;
  productId: string;
  productName: string;
  quantity: number;
  packageQuantity: number;
};

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function addBarcodeToProductCounting(
  lines: ProductCountingLine[],
  products: Product[],
  scannedBarcode: string
): { lines: ProductCountingLine[]; product: Product } | null {
  const barcode = scannedBarcode.trim();
  const parsedCode = parseScannedCode(barcode);
  const barcodeIndex = createBarcodeIndex(products);
  const exactMatch = barcodeIndex.get(barcode);
  const match = exactMatch ?? parsedCode.lookupBarcodes
    .filter((candidate) => candidate !== barcode)
    .map((candidate) => barcodeIndex.get(candidate))
    .find((candidate) => candidate !== undefined);

  if (match === undefined) return null;

  const quantityToAdd = exactMatch === undefined
    ? parsedCode.weight ?? match.barcodeInfo.ratio ?? 1
    : match.product.isWeight
      ? match.barcodeInfo.ratio ?? 1
      : 1;
  const existingLine = lines.find((line) => line.productId === match.product.uid);

  if (existingLine === undefined) {
    return {
      product: match.product,
      lines: [
        ...lines,
        {
          productCode: match.product.code,
          productId: match.product.uid,
          productName: match.product.name,
          quantity: roundQuantity(quantityToAdd),
          packageQuantity: 1
        }
      ]
    };
  }

  return {
    product: match.product,
    lines: lines.map((line) => line.productId === match.product.uid
      ? {
          ...line,
          quantity: roundQuantity(line.quantity + quantityToAdd),
          packageQuantity: line.packageQuantity + 1
        }
      : line)
  };
}

function isProductCountingLine(value: unknown): value is ProductCountingLine {
  return typeof value === "object" && value !== null &&
    "productCode" in value && typeof value.productCode === "string" &&
    "productId" in value && typeof value.productId === "string" &&
    "productName" in value && typeof value.productName === "string" &&
    "quantity" in value && typeof value.quantity === "number" && Number.isFinite(value.quantity) && value.quantity > 0 &&
    "packageQuantity" in value && typeof value.packageQuantity === "number" && Number.isInteger(value.packageQuantity) && value.packageQuantity > 0;
}

export function loadProductCounting(): ProductCountingLine[] {
  if (typeof window === "undefined") return [];

  const rawValue = window.localStorage.getItem(PRODUCT_COUNTING_STORAGE_KEY);
  if (rawValue === null) return [];

  try {
    const value: unknown = JSON.parse(rawValue);
    return Array.isArray(value) && value.every(isProductCountingLine) ? value : [];
  } catch {
    return [];
  }
}

export function saveProductCounting(lines: ProductCountingLine[]) {
  if (typeof window === "undefined") return;

  if (lines.length === 0) {
    window.localStorage.removeItem(PRODUCT_COUNTING_STORAGE_KEY);
  } else {
    window.localStorage.setItem(PRODUCT_COUNTING_STORAGE_KEY, JSON.stringify(lines));
  }
}
