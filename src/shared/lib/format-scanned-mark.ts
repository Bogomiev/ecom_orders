import { normalizeScannerLayout } from "./normalize-scanner-layout";

// GS separates variable-length fields. Without GS, accept only known short
// serial lengths and a complete verification suffix, not arbitrary AI matches.
export function formatScannedMark(value: string): string {
  const normalized = normalizeScannerLayout(value);
  const input = normalized.trim().replace(/^\]d2/, "").replace(/^\u001d+/, "");
  const header = input.match(/^(?:\(01\)|01)(\d{14})(?:\(21\)|21)/);
  if (!header) return normalized;

  const rest = input.slice(header[0].length);
  const boundary = rest.search(/\u001d|\((?:91|92|93)\)/);
  let serial = rest;
  let verification = "";
  if (boundary >= 0) {
    serial = rest.slice(0, boundary);
    verification = rest.slice(boundary).replace(/^\u001d+/, "");
  } else {
    const suffix = rest.match(/^(.{6}|.{7}|.{13})(93.{4}|91.{4}92.+)$/);
    if (suffix) {
      serial = suffix[1];
      verification = suffix[2];
    }
  }
  if (!serial) return normalized;
  const shortCheck = verification.match(/^(?:\(93\)|93)([^\u001d]{4})(?:\u001d)?$/);
  return `(01)${header[1]}(21)${serial}${shortCheck ? `(93)${shortCheck[1]}` : ""}`;
}
