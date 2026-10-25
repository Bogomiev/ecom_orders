export const FILE_FORMAT_ERROR = "Допускаются только файлы PDF (.pdf) и HTML (.html).";

export function isAllowedFileName(name: string) {
  return /\.(pdf|html)$/i.test(name.trim());
}
