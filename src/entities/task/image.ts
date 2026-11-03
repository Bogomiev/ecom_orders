export function qrImageSource(value: string): string {
 if (/^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(value)) return value;
 try {
  if (/<svg[\s>]/i.test(atob(value))) return `data:image/svg+xml;base64,${value}`;
 } catch { /* Keep the existing fallback for unrecognized Base64 values. */ }
 const mime=value.startsWith("/9j/")?"image/jpeg":value.startsWith("R0lGOD")?"image/gif":value.startsWith("UklGR")?"image/webp":"image/png";
 return `data:${mime};base64,${value}`;
}
