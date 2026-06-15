import { describe, expect, it } from "vitest";
import { formatCount, formatDayTick, formatPercent } from "./format";

/** Collapses any whitespace (incl. ICU narrow no-break spaces) to a space. */
function ws(value: string): string {
  return value.replace(/\s/g, " ");
}

describe("formatPercent", () => {
  it("rounds a ratio to a whole percent (default en-US)", () => {
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

  it("uses the French percent format (space before %)", () => {
    expect(ws(formatPercent(0.83, "fr-FR"))).toBe("83 %");
  });
});

describe("formatCount", () => {
  it("groups thousands per locale", () => {
    expect(formatCount(1234)).toBe("1,234");
    expect(ws(formatCount(1234, "fr-FR"))).toBe("1 234");
    expect(formatCount(7)).toBe("7");
  });
});

describe("formatDayTick", () => {
  it("renders a short month-and-day label in English", () => {
    expect(formatDayTick("2026-06-13")).toBe("Jun 13");
    expect(formatDayTick("2026-01-01")).toBe("Jan 1");
  });

  it("renders the French short date", () => {
    expect(formatDayTick("2026-06-13", "fr-FR")).toBe("13 juin");
  });

  it("falls back to the raw value when unparseable", () => {
    expect(formatDayTick("bogus")).toBe("bogus");
  });
});
