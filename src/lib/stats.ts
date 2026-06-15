/**
 * Pure transforms for the stats charts. No I/O, no React.
 */
import type { ContinentStat, ForgettingPoint } from "../types/domain";

/** Stability constant (days) for the reference Ebbinghaus curve. */
export const EBBINGHAUS_STABILITY_DAYS = 5;

/**
 * Share of cards mastered in a continent, as a 0–100 percentage. Each
 * country contributes two cards (capital + flag), so the denominator is
 * `total_countries * 2`.
 */
export function continentMasteryPercent(stat: ContinentStat): number {
  const maxCards = stat.total_countries * 2;
  if (maxCards === 0) return 0;
  return Math.round((stat.cards_mastered / maxCards) * 100);
}

/** Theoretical retention R(t) = e^(-t / stability), in [0, 1]. */
export function ebbinghausRetention(
  days: number,
  stability: number = EBBINGHAUS_STABILITY_DAYS,
): number {
  if (days <= 0) return 1;
  return Math.exp(-days / stability);
}

export interface ForgettingDatum {
  /** Whole days since the same card was previously reviewed. */
  day: number;
  /** Observed recall rate at this gap (%), or `null` when no samples. */
  observed: number | null;
  /** Number of answers observed at this gap. */
  samples: number;
  /** Reference Ebbinghaus retention at this gap (%). */
  theoretical: number;
}

/**
 * Merges observed forgetting points with the reference curve into one dense
 * series (day 0 … max observed day) so a single chart can overlay both.
 */
export function buildForgettingSeries(
  points: readonly ForgettingPoint[],
): ForgettingDatum[] {
  if (points.length === 0) return [];
  const maxDay = points.reduce(
    (max, p) => Math.max(max, p.days_since_review),
    0,
  );
  const observed = new Map(points.map((p) => [p.days_since_review, p]));
  const series: ForgettingDatum[] = [];
  for (let day = 0; day <= maxDay; day += 1) {
    const point = observed.get(day);
    series.push({
      day,
      observed: point ? Math.round(point.correct_rate * 100) : null,
      samples: point ? point.samples : 0,
      theoretical: Math.round(ebbinghausRetention(day) * 100),
    });
  }
  return series;
}
