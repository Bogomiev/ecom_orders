import { describe, expect, it } from "vitest";
import { normalizeSellerBarcode } from "./normalize-seller-barcode";

describe("normalizeSellerBarcode", () => {
  it("сопоставляет русскую раскладку с английской", () => {
    expect(normalizeSellerBarcode("йцукенгшщзхъ")).toBe("qwertyuiop[]");
    expect(normalizeSellerBarcode("фывапролджэ")).toBe("asdfghjkl;'");
    expect(normalizeSellerBarcode("ячсмитьбю")).toBe("zxcvbnm,.");
  });

  it("сохраняет регистр и сопоставляет знаки", () => {
    expect(normalizeSellerBarcode("ЁЙЦЖЭБЮ")).toBe("~QW:\"<>");
  });

  it("не изменяет английские символы и цифры", () => {
    expect(normalizeSellerBarcode("Seller-123")).toBe("Seller-123");
  });
});
