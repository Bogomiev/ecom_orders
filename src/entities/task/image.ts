export function qrImageSource(value: string): string {
 if (/^data:image\/(png|jpeg|gif|webp);base64,/.test(value)) return value;
 const mime=value.startsWith("/9j/")?"image/jpeg":value.startsWith("R0lGOD")?"image/gif":value.startsWith("UklGR")?"image/webp":"image/png";
 return `data:${mime};base64,${value}`;
}
