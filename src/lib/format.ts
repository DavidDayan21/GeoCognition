/**
 * Pure display formatters for the practice and stats UIs. No I/O, no React.
 *
 * Each formatter takes an optional BCP-47 `locale` (e.g. `"en-US"`, `"fr-FR"`)
 * and uses the `Intl` APIs so numbers and dates read naturally in the active
 * language. The locale defaults to US English to keep existing callers and
 * tests stable. Relative phrasing like "in 3 days" is handled by i18next in
 * the components rather than here.
 */

const DEFAULT_LOCALE = "en-US";

/** Formats a 0–1 ratio as a whole-number percentage, e.g. `0.833` → `"83%"`. */
export function formatPercent(
  ratio: number,
  locale: string = DEFAULT_LOCALE,
): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(clamped);
}

/** Formats an integer count with the locale's grouping, e.g. `1234` → `"1,234"`. */
export function formatCount(
  value: number,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Formats a `YYYY-MM-DD` date as a short axis tick, e.g. `"Jun 13"` / `"13 juin"`. */
export function formatDayTick(
  isoDate: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
