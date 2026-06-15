import { describe, expect, it } from "vitest";
import type { ContinentStat, ForgettingPoint } from "../types/domain";
import {
  buildForgettingSeries,
  continentMasteryPercent,
  ebbinghausRetention,
} from "./stats";

function continent(
  total_countries: number,
  cards_mastered: number,
): ContinentStat {
  return {
    continent: "Asia",
    total_countries,
    cards_seen: cards_mastered,
    cards_mastered,
    avg_ef: 2.5,
  };
}

describe("continentMasteryPercent", () => {
  it("is the mastered share of all cards (two per country)", () => {
    expect(continentMasteryPercent(continent(10, 10))).toBe(50);
    expect(continentMasteryPercent(continent(10, 20))).toBe(100);
    expect(continentMasteryPercent(continent(10, 0))).toBe(0);
  });

  it("is 0 when a continent has no countries", () => {
    expect(continentMasteryPercent(continent(0, 0))).toBe(0);
  });
});

describe("ebbinghausRetention", () => {
  it("is full at day 0 and decays monotonically", () => {
    expect(ebbinghausRetention(0)).toBe(1);
    expect(ebbinghausRetention(5)).toBeCloseTo(Math.exp(-1));
    expect(ebbinghausRetention(2)).toBeGreaterThan(ebbinghausRetention(8));
  });
});

describe("buildForgettingSeries", () => {
  it("returns an empty series with no data", () => {
    expect(buildForgettingSeries([])).toEqual([]);
  });

  it("fills every day to the max and marks gaps as null observed", () => {
    const points: ForgettingPoint[] = [
      { days_since_review: 1, correct_rate: 0.9, samples: 10 },
      { days_since_review: 3, correct_rate: 0.5, samples: 4 },
    ];
    const series = buildForgettingSeries(points);

    expect(series.map((d) => d.day)).toEqual([0, 1, 2, 3]);
    expect(series[1].observed).toBe(90);
    expect(series[1].samples).toBe(10);
    expect(series[2].observed).toBeNull();
    expect(series[3].observed).toBe(50);
    // Theoretical curve is present at every day and decreasing.
    expect(series[0].theoretical).toBe(100);
    expect(series[3].theoretical).toBeLessThan(series[1].theoretical);
  });
});
