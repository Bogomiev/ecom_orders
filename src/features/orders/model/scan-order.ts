import type { Order } from "@/entities/order";
import type { BarcodeInfo, Product } from "@/entities/product";

const EAN_13_PATTERN = /^\d{13}$/;
export const WEIGHT_QUANTITY_OVERAGE_PERCENT = 20;

function isWebsiteOrder(order: Order) {
  return order.source.trim().toLowerCase() === "сайт";
}

export type ParsedScannedCode = {
  isMark: boolean;
  lookupBarcodes: string[];
  weight?: number;
};

export type BarcodeIndexEntry = {
  barcodeInfo: BarcodeInfo;
  product: Product;
};

export type ScanOrderErrorCode =
  | "barcode-not-found"
  | "product-not-in-order"
  | "mark-required"
  | "mark-already-scanned"
  | "quantity-exceeded";

export type ScanOrderResult =
  | { status: "success"; order: Order; product: Product }
  | {
      status: "error";
      code: ScanOrderErrorCode;
      barcode: string;
      product?: Product;
    };

export function parseScannedCode(value: string): ParsedScannedCode {
  if (EAN_13_PATTERN.test(value)) {
    if (value.startsWith("2") && hasValidEan13CheckDigit(value)) {
      const productCode = value.slice(2, 7);
      const normalizedProductCode = productCode.replace(/^0+(?=\d)/, "");
      const weightBarcodeTemplate = `2_${productCode}00000_`;

      return {
        isMark: false,
        lookupBarcodes: [
          value,
          weightBarcodeTemplate,
          productCode,
          normalizedProductCode
        ],
        weight: Number(value.slice(7, 12)) / 1000
      };
    }

    return { isMark: false, lookupBarcodes: [value] };
  }

  const normalizedValue = value
    .replace(/^\]d2/, "")
    .replace(/^\u001d+/, "");
  const parenthesizedGtin = normalizedValue.match(/\(01\)(\d{14})/);
  const rawGtin = normalizedValue.match(/^01(\d{14})/);
  const gtin = parenthesizedGtin?.[1] ?? rawGtin?.[1];

  if (gtin === undefined) {
    return { isMark: false, lookupBarcodes: [value] };
  }

  return {
    isMark: true,
    lookupBarcodes: gtin.startsWith("0") ? [gtin, gtin.slice(1)] : [gtin]
  };
}

function hasValidEan13CheckDigit(value: string) {
  const expectedCheckDigit = Number(value[12]);
  const sum = value
    .slice(0, 12)
    .split("")
    .reduce(
      (total, digit, index) =>
        total + Number(digit) * (index % 2 === 0 ? 1 : 3),
      0
    );

  return (10 - (sum % 10)) % 10 === expectedCheckDigit;
}

export function createBarcodeIndex(products: Product[]) {
  const index = new Map<string, BarcodeIndexEntry>();

  products.forEach((product) => {
    product.barcodes.forEach((barcodeInfo) => {
      index.set(barcodeInfo.barcode, { barcodeInfo, product });
    });
  });

  return index;
}

export function applyBarcodeToOrder(
  order: Order,
  barcodeIndex: Map<string, BarcodeIndexEntry>,
  scannedBarcode: string
): ScanOrderResult {
  const barcode = scannedBarcode.trim();
  const parsedCode = parseScannedCode(barcode);
  const exactBarcodeMatch = barcodeIndex.get(barcode);
  const barcodeMatch = exactBarcodeMatch ?? parsedCode.lookupBarcodes
    .filter((lookupBarcode) => lookupBarcode !== barcode)
    .map((lookupBarcode) => barcodeIndex.get(lookupBarcode))
    .find((match) => match !== undefined);

  if (barcodeMatch === undefined) {
    return { status: "error", code: "barcode-not-found", barcode };
  }

  const { barcodeInfo, product } = barcodeMatch;
  const orderItem = order.items.find(
    (item) => item.product_id === product.uid && !item.canceled
  );

  if (orderItem === undefined) {
    return {
      status: "error",
      code: "product-not-in-order",
      barcode,
      product
    };
  }

  if (orderItem.marking_product && !parsedCode.isMark) {
    return { status: "error", code: "mark-required", barcode, product };
  }

  if (
    orderItem.marking_product &&
    order.controlledItems.some((item) => item.mark === barcode)
  ) {
    return {
      status: "error",
      code: "mark-already-scanned",
      barcode,
      product
    };
  }

  const quantityToAdd = exactBarcodeMatch === undefined
    ? parsedCode.weight ?? barcodeInfo.ratio ?? 1
    : barcodeInfo.ratio ?? 1;
  const nextQuantityFact = orderItem.quantity_fact + quantityToAdd;
  const isWeightBarcode = exactBarcodeMatch === undefined && parsedCode.weight !== undefined;
  const isWeightItem = orderItem.is_weight || isWeightBarcode;
  const maximumQuantity = isWebsiteOrder(order) && isWeightItem
    ? Number.POSITIVE_INFINITY
    : isWeightItem
      ? orderItem.quantity * (1 + WEIGHT_QUANTITY_OVERAGE_PERCENT / 100)
      : orderItem.quantity;

  if (nextQuantityFact > maximumQuantity) {
    return {
      status: "error",
      code: "quantity-exceeded",
      barcode,
      product
    };
  }

  return {
    status: "success",
    product,
    order: {
      ...order,
      items: order.items.map((item) =>
        item.product_id === product.uid
          ? { ...item, quantity_fact: nextQuantityFact }
          : item
      ),
      controlledItems: orderItem.marking_product
        ? [
            ...order.controlledItems,
            {
              product_id: product.uid,
              product_name: product.name,
              quantity: quantityToAdd,
              mark: barcode,
              result: true
            }
          ]
        : order.controlledItems
    }
  };
}
