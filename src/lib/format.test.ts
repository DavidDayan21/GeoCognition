import { describe, expect, it } from "vitest";
import { formatDayTick, formatNextReview, formatPercent } from "./format";

describe("formatPercent", () => {
  it("rounds a ratio to a whole percent", () => {
    expect(formatPercent(0.833)).toBe("83%");
    expect(formatPercent(0.5)).toBe("50%");
  });

  it("handles the endpoints", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("clamps out-of-range input", () => {
    expect(formatPercent(-0.2)).toBe("0%");
    expect(formatPercent(1.5)).toBe("100%");
  });
});

describe("formatNextReview", () => {
  it("renders today, singular, and plural days", () => {
    expect(formatNextReview(0)).toBe("today");
    expect(formatNextReview(1)).toBe("in 1 day");
    expect(formatNextReview(6)).toBe("in 6 days");
  });

  it("treats non-positive intervals as today", () => {
    expect(formatNextReview(-3)).toBe("today");
  });
});

describe("formatDayTick", () => {
  it("renders a short month-and-day label", () => {
    expect(formatDayTick("2026-06-13")).toBe("Jun 13");
    expect(formatDayTick("2026-01-01")).toBe("Jan 1");
  });

  it("falls back to the raw value when unparseable", () => {
    expect(formatDayTick("bogus")).toBe("bogus");
  });
});
