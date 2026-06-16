/**
 * Shared color mapping for Border Run country states, used by both the map
 * (SVG fill) and the chain display (chip background). The values are CSS
 * custom properties defined in `styles/tokens.css`, so they adapt to the
 * active theme.
 */

/** How a country in the chain is classified for coloring. */
export type CountryColor = "start" | "end" | "path" | "detour";

const COLOR_VAR: Record<CountryColor, string> = {
  start: "var(--br-start)",
  end: "var(--br-end)",
  path: "var(--br-path)",
  detour: "var(--br-detour)",
};

/** Neutral silhouette fill for not-yet-revealed countries. */
export const BLANK_FILL = "var(--br-blank)";

/** Transient fill for a non-adjacent guess flashing on the map. */
export const FLASH_FILL = "var(--br-flash)";

/** The CSS color for a classified country. */
export function colorVar(color: CountryColor): string {
  return COLOR_VAR[color];
}
