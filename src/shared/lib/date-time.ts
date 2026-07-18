const MOSCOW_UTC_OFFSET = "+03:00";
const TIME_ZONE_SUFFIX_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function parseMoscowDateTime(value: string) {
  const normalizedValue = value.trim().replace(" ", "T");

  if (normalizedValue === "") {
    return new Date(Number.NaN);
  }

  const dateTime = normalizedValue.includes("T")
    ? normalizedValue
    : `${normalizedValue}T00:00:00`;

  return new Date(
    TIME_ZONE_SUFFIX_PATTERN.test(dateTime)
      ? dateTime
      : `${dateTime}${MOSCOW_UTC_OFFSET}`
  );
}
