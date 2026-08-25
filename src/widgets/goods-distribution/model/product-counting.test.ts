import { describe, expect, it } from "vitest";
import type { Product } from "@/entities/product";
import { addBarcodeToProductCounting } from "./product-counting";

const products: Product[] = [
  { uid: "piece", code: "10", name: "Штучный товар", markingType: "", isWeight: false, barcodes: [{ barcode: "4600000000001", unit: "шт", ratio: 5, isBase: true }] },
  { uid: "weight", code: "12345", name: "Весовой товар", markingType: "", isWeight: true, barcodes: [{ barcode: "2_1234500000_", unit: "кг", ratio: 1, isBase: true }] }
];

describe("addBarcodeToProductCounting", () => {
  it("суммирует повторные сканирования товара в одной строке", () => {
    const first = addBarcodeToProductCounting([], products, "4600000000001");
    const second = addBarcodeToProductCounting(first!.lines, products, "4600000000001");

    expect(second!.lines).toEqual([{ productCode: "10", productId: "piece", productName: "Штучный товар", quantity: 2, packageQuantity: 2 }]);
  });

  it("берет вес из весового штрихкода", () => {
    // EAN-13 для кода товара 12345 и веса 0.750 кг с корректной контрольной цифрой.
    const result = addBarcodeToProductCounting([], products, "2012345007505");
    expect(result!.lines[0]).toMatchObject({ quantity: 0.75, packageQuantity: 1 });
  });
});
