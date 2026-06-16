/**
 * Shared color mapping for Border Run country states, used by both the map
 * (SVG fill) and the chain display (chip background). The values are CSS
 * custom properties defined in `styles/tokens.css`, so they adapt to the
 * active theme.
 */

import type { CountryClassification } from "../../types/domain";

/** How a placed country is classified for coloring. */
export type CountryColor = "start" | "end" | "path" | "detour" | "disconnected";

const COLOR_VAR: Record<CountryColor, string> = {
  start: "var(--br-start)",
  end: "var(--br-end)",
  path: "var(--br-path)",
  detour: "var(--br-detour)",
  disconnected: "var(--br-disconnected)",
};

/** Maps a backend country classification to its UI color token key. */
const CLASSIFICATION_COLOR: Record<CountryClassification, CountryColor> = {
  start: "start",
  end: "end",
  on_shortest_path: "path",
  adjacent_to_shortest_path: "detour",
  disconnected: "disconnected",
};

/** Neutral silhouette fill for not-yet-revealed countries. */
export const BLANK_FILL = "var(--br-blank)";

/** The UI color key for a backend classification. */
export function colorOf(classification: CountryClassification): CountryColor {
  return CLASSIFICATION_COLOR[classification];
}

/** The CSS color for a classified country. */
export function colorVar(color: CountryColor): string {
  return COLOR_VAR[color];
}
