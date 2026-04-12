export function formatLocalizedDate(
  value: string | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}
