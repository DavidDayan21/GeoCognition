/**
 * Pure display formatters for the practice and stats UIs. No I/O, no React.
 */

/** Formats a 0–1 ratio as a whole-number percentage, e.g. `0.833` → `"83%"`. */
export function formatPercent(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  return `${Math.round(clamped * 100)}%`;
}

/**
 * Human-friendly description of when a card is next due, given its SM-2
 * interval in days. Non-positive intervals render as `"today"`.
 */
export function formatNextReview(intervalDays: number): string {
  if (intervalDays <= 0) return "today";
  if (intervalDays === 1) return "in 1 day";
  return `in ${intervalDays} days`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Formats a `YYYY-MM-DD` date as a short axis tick, e.g. `"Jun 13"`. */
export function formatDayTick(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  const name = MONTHS[Number(month) - 1];
  if (!name || day === undefined) return isoDate;
  return `${name} ${Number(day)}`;
}
