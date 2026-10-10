import { describe, expect, it } from "vitest";
import { normalizeScannerLayout } from "./normalize-scanner-layout";

describe("normalizeScannerLayout", () => {
  it("исправляет все буквы русской раскладки с учётом регистра", () => {
    expect(normalizeScannerLayout(
      "ёйцукенгшщзхъфывапролджэячсмитьбюЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ"
    )).toBe("`qwertyuiop[]asdfghjkl;'zxcvbnm,.~QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>");
  });

  it("сохраняет ASCII, управляющие разделители и прочие спецсимволы", () => {
    const symbols = Array.from({ length: 128 }, (_, index) => String.fromCharCode(index)).join("") + "№€";
    expect(normalizeScannerLayout(symbols)).toBe(symbols);
    expect(normalizeScannerLayout(`й${symbols}Ц`)).toBe(`q${symbols}W`);
  });
});
