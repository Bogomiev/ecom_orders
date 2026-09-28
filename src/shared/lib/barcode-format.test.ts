import { describe, expect, it } from "vitest";
import JsBarcode from "jsbarcode";
import { findDisplayBarcode, getBarcodeFormat, isNumericBarcode } from "./barcode-format";

describe("product barcode format", () => {
  it.each([
    ["4006381333931", "EAN13"],
    ["96385074", "EAN8"],
    ["036000291452", "UPC"],
    ["ABC-123", null],
    ["00123", "CODE128"],
    // Invalid retail checksum must not silently change the product code.
    ["4006381333932", "CODE128"],
    ["", null],
    ["2_1234500000_", null],
    ["2_0026300000_", null],
    ["Товар", null]
  ])("selects %s as %s", (value, expected) => {
    expect(getBarcodeFormat(value)).toBe(expected);
  });
});

it("encodes a numeric barcode without losing leading zeroes", () => {
  const value = "00123";
  const output: { encodings?: { data: string; text: string }[] } = {};
  JsBarcode(output, value, { format: getBarcodeFormat(value)!, displayValue: true });
  expect(output.encodings?.length).toBeGreaterThan(0);
  expect(output.encodings?.map((encoding) => encoding.text).join("")).toBe(value);
  expect(output.encodings?.map((encoding) => encoding.data).join("")).toMatch(/^[01]+$/);
});

it.each(["2_0026300000_", "ABC123", "123 456", "", "(01)04601234567890"])("skips barcode lookup for %s", (value) => {
  expect(isNumericBarcode(value)).toBe(false);
});

it("selects the first renderable barcode in source order, skipping templates and letters", () => {
  expect(findDisplayBarcode([
    { barcode: "2_0026300000_" },
    { barcode: "ABC" },
    { barcode: "4006381333931" },
    { barcode: "96385074" }
  ])).toBe("4006381333931");
});

it("does not render when no numeric barcode exists", () => {
  expect(findDisplayBarcode([{ barcode: "2_0026300000_" }, { barcode: "ABC" }])).toBeUndefined();
  expect(findDisplayBarcode([])).toBeUndefined();
});
