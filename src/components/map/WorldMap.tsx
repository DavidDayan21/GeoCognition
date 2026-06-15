import { useReducedMotion } from "framer-motion";
import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { CONTINENT_GEO_URL } from "./map-utils";
import type { ContinentGeography } from "./map-utils";

export interface WorldMapProps {
  selectedContinents: string[];
  onToggleContinent: (continent: string) => void;
}

/**
 * Interactive continent-selection map. Renders 6 pre-dissolved continent
 * shapes — no internal country borders. Each shape is independently
 * clickable; selected continents fill with the accent color, unselected with
 * the surface-2 token. Hovering lifts the shape slightly (scale + shadow)
 * to communicate interactivity without any fill change.
 * Respects `prefers-reduced-motion`: no lift in reduced mode, fill only.
 */
export function WorldMap({
  selectedContinents,
  onToggleContinent,
}: WorldMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <div className="w-full overflow-hidden rounded-card border border-border bg-surface">
      <ComposableMap
        projection="geoEqualEarth"
        // scale + center are derived from continents.geojson via
        // geoEqualEarth().fitExtent (see build-continents-geo.ts, which logs
        // the values when regenerating the geometry) so the 6 continents fill
        // the 800x370 frame with no clipping and minimal dead space. Antarctica
        // is excluded, so center latitude is shifted north to balance margins.
        projectionConfig={{ scale: 146.09, center: [0, 6.847] }}
        width={800}
        height={370}
        style={{ width: "100%", height: "auto" }}
        aria-label="World map for selecting continents"
      >
        <Geographies geography={CONTINENT_GEO_URL}>
          {({ geographies }) => {
            const continents = geographies as ContinentGeography[];
            // SVG uses painter's model: render the hovered continent last so
            // its lifted shadow paints on top of siblings.
            const sorted = hovered
              ? [...continents].sort((a, b) => {
                  if (a.properties.continent === hovered) return 1;
                  if (b.properties.continent === hovered) return -1;
                  return 0;
                })
              : continents;

            return sorted.map((geo) => {
              const continent = geo.properties.continent;
              const selected = selectedContinents.includes(continent);
              const fill = selected ? "var(--accent)" : "var(--surface-2)";

              const liftStyle = prefersReducedMotion
                ? {}
                : {
                    transform: "scale(1.02)",
                    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.12))",
                  };

              const pressStyle = prefersReducedMotion
                ? {}
                : {
                    transform: "scale(1.015)",
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.06))",
                  };

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={-1}
                  onMouseEnter={() => setHovered(continent)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onToggleContinent(continent)}
                  style={{
                    default: {
                      fill,
                      stroke: "var(--border)",
                      strokeWidth: 1,
                      outline: "none",
                      cursor: "pointer",
                      transition: prefersReducedMotion
                        ? "fill 200ms"
                        : "fill 200ms, transform 150ms ease-out, filter 150ms ease-out",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    },
                    hover: {
                      fill,
                      stroke: "var(--border)",
                      strokeWidth: 1,
                      outline: "none",
                      cursor: "pointer",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      ...liftStyle,
                    },
                    pressed: {
                      fill,
                      stroke: "var(--border)",
                      strokeWidth: 1,
                      outline: "none",
                      cursor: "pointer",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      ...pressStyle,
                    },
                  }}
                />
              );
            });
          }}
        </Geographies>
      </ComposableMap>
    </div>
  );
}
