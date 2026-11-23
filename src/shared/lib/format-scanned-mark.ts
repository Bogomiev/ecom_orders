import { normalizeScannerLayout } from "./normalize-scanner-layout";

export function formatScannedMark(
  value: string,
  { skipFormatting = false, removeCryptoTail = false } = {}
): string {
  const normalized = normalizeScannerLayout(value);
  if (skipFormatting && !removeCryptoTail) return normalized;

  const header = normalized.match(/^\s*(?:\]d2)?\u001d*(?:\(01\)|01)(\d{14})(?:\(21\)|21)/);
  if (!header) return normalized;

  const rest = normalized.slice(header[0].length);
  // Without GS, use the known serial lengths and a complete verification suffix.
  const boundary = rest.search(/\u001d+(?=(?:\((?:91|92|93)\)|91|92|93))|\((?:91|92|93)\)/);
  const suffix = boundary < 0 && !rest.includes("\u001d")
    ? rest.trimEnd().match(/^(.{6}|.{7}|.{13})(93.{4}|91.{4}92.+)$/)
    : null;
  const serialLength = boundary >= 0 ? boundary : suffix?.[1].length;
  if (skipFormatting) {
    return serialLength === undefined
      ? normalized
      : normalized.slice(0, header[0].length + serialLength);
  }

  const serial = rest.slice(0, serialLength).trimEnd();
  if (!serial) return normalized;

  let verification = "";
  if (!removeCryptoTail && serialLength !== undefined) {
    verification = rest.slice(serialLength).trimEnd();
    if (suffix) {
      verification = verification.replace(/^91(.{4})92/, "(91)$1(92)");
    }
    verification = verification.replace(/(?:^|\u001d+)(91|92|93|\((?:91|92|93)\))/g, (_, ai: string) =>
        ai.startsWith("(") ? ai : `(${ai})`
      );
  }

  return `(01)${header[1]}(21)${serial}${verification}`;
}
