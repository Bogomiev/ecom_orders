import { describe, expect, it } from "vitest";
import type { Product } from "@/entities/product";
import { createBarcodeIndex } from "../../../features/orders/model/scan-order";
import { addReturnScan } from "./return-request";

const markedCode = "4640068520186";
const plainCode = "4600000000001";
const product = (uid: string, barcode: string, markingType: string): Product => ({
  uid, code: uid, name: uid, markingType, isWeight: false, isThermalMode: false,
  barcodes: [{ barcode, unit: "шт", ratio: 1, isBase: true }]
});

const catalog = createBarcodeIndex([
  product("marked", markedCode, "Маркировка"),
  product("plain", plainCode, "БезОсобенностейУчета")
]);

describe("return scans", () => {
  it("merges ordinary products into one line", () => {
    const first = addReturnScan([], catalog, plainCode);
    expect(addReturnScan(first, catalog, plainCode)).toEqual([{ product_id: "plain", amount: 2 }]);
  });

  it("requires a mark and rejects the same serial in a different format", () => {
    expect(() => addReturnScan([], catalog, markedCode)).toThrow("Отсканируйте марку");
    const items = addReturnScan([], catalog, "(01)04640068520186(21)5cb/SG");
    expect(() => addReturnScan(items, catalog, "0104640068520186215cb/SG")).toThrow("уже отсканирована");
    expect(addReturnScan(items, catalog, "(01)04640068520186(21)6cb/SG")).toEqual([{
      product_id: "marked", amount: 2, marks: ["(01)04640068520186(21)5cb/SG", "(01)04640068520186(21)6cb/SG"]
    }]);
  });
});
