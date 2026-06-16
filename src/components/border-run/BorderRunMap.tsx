import { useTranslation } from "react-i18next";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { WORLD_GEO_URL } from "../map/map-utils";
import type { MapGeography } from "../map/map-utils";
import {
  BLANK_FILL,
  colorVar,
  FLASH_FILL,
  type CountryColor,
} from "./border-run-colors";

export interface BorderRunMapProps {
  /** ISO alpha-3 → color classification for revealed countries. */
  colors: Record<string, CountryColor>;
  /** ISO alpha-3 of a non-adjacent guess flashing red, or null. */
  flash: string | null;
}

/**
 * The "mystery map": all 195 countries render as a single neutral silhouette
 * (fill === stroke, so internal borders vanish and only continent outlines
 * remain) until they enter the player's route. A revealed country takes its
 * state color with a contrasting stroke so its shape pops against neighbors;
 * a non-adjacent guess flashes red for a beat before reverting.
 *
 * Not interactive — guessing is text-only, so there are no hover/click states.
 */
export function BorderRunMap({ colors, flash }: BorderRunMapProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full overflow-hidden rounded-card border border-border bg-surface">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 150 }}
        width={800}
        height={380}
        style={{ width: "100%", height: "auto" }}
        aria-label={t("borderRun.title")}
      >
        <Geographies geography={WORLD_GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo: MapGeography) => {
              const iso = geo.properties.iso_a3;
              const color = iso ? colors[iso] : undefined;
              const isFlashing = iso != null && iso === flash;

              const fill = isFlashing
                ? FLASH_FILL
                : color
                  ? colorVar(color)
                  : BLANK_FILL;
              // Revealed/flashing countries get a contrasting outline; blank
              // ones use fill === stroke so internal borders stay hidden.
              const stroke = color || isFlashing ? "var(--bg)" : BLANK_FILL;
              const strokeWidth = color || isFlashing ? 0.75 : 0.5;

              const style = {
                fill,
                stroke,
                strokeWidth,
                outline: "none",
                transition: "fill 200ms cubic-bezier(0.22, 1, 0.36, 1)",
              };

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={-1}
                  style={{ default: style, hover: style, pressed: style }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
