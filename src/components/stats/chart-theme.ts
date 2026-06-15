/**
 * Concrete chart colors resolved from the design-token CSS variables, plus a
 * shared tooltip style. Recharts renders colors as SVG attributes (where
 * `var(--x)` does not resolve), so charts use these resolved values.
 */
import type { CSSProperties } from "react";
import { useCssVars } from "../../lib/css-vars";

const CHART_VARS = [
  "--accent",
  "--border",
  "--text",
  "--text-muted",
  "--surface",
] as const;

export type ChartColors = Record<(typeof CHART_VARS)[number], string>;

/** Chart palette, re-resolved when the theme changes. */
export function useChartColors(): ChartColors {
  return useCssVars(CHART_VARS);
}

/** Tooltip container style matching the surface/border tokens. */
export function tooltipStyle(colors: ChartColors): CSSProperties {
  return {
    background: colors["--surface"],
    border: `1px solid ${colors["--border"]}`,
    borderRadius: 8,
    color: colors["--text"],
    fontSize: 12,
  };
}
