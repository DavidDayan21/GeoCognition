import { useReducedMotion } from "framer-motion";
import { LocateFixed } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { WORLD_GEO_URL } from "../map/map-utils";
import type { MapGeography } from "../map/map-utils";
import { BLANK_FILL, colorVar, type CountryColor } from "./border-run-colors";
import type { MapFocus } from "./map-focus";

export interface BorderRunMapProps {
  /** ISO alpha-3 → color classification for placed countries. */
  colors: Record<string, CountryColor>;
  /**
   * Auto-zoom view for the current game (start+end bounding region), or `null`
   * to show the full world map (endpoints too far apart, or not yet known).
   */
  focus: MapFocus | null;
}

/** Internal pan/zoom position, in the shape ZoomableGroup reports/consumes. */
interface Position {
  coordinates: [number, number];
  zoom: number;
}

/** The default, fully-zoomed-out world view. */
const WORLD_VIEW: Position = { coordinates: [0, 0], zoom: 1 };

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
/** Duration of the auto-zoom transition, in ms. */
const ZOOM_MS = 500;

/** Resolves a focus to a concrete position, falling back to the world view. */
function viewFor(focus: MapFocus | null): Position {
  return focus ? { coordinates: focus.center, zoom: focus.zoom } : WORLD_VIEW;
}

/**
 * The "mystery map": all 195 countries render as a single neutral silhouette
 * until they enter the player's route, when they take their classification
 * color. On game start the map animates to the bounding region of the start
 * and end countries (snapping instead when reduced motion is preferred); the
 * player can then freely pan (drag) and zoom (wheel / trackpad pinch) at any
 * time, and the corner button resets back to that auto-zoom view.
 */
export function BorderRunMap({ colors, focus }: BorderRunMapProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion() ?? false;

  const [position, setPosition] = useState<Position>(() => viewFor(focus));
  // Toggles the transform transition: on for programmatic moves (auto-zoom,
  // reset), off during direct manipulation so dragging stays responsive.
  const [animating, setAnimating] = useState(false);
  const animateTimer = useRef<number | null>(null);

  const goTo = useCallback((next: Position, animate: boolean) => {
    if (animateTimer.current !== null) {
      window.clearTimeout(animateTimer.current);
      animateTimer.current = null;
    }
    if (animate) {
      setAnimating(true);
      animateTimer.current = window.setTimeout(() => {
        setAnimating(false);
        animateTimer.current = null;
      }, ZOOM_MS + 20);
    }
    setPosition(next);
  }, []);

  // Animate to the auto-zoom view whenever the game (its focus) changes.
  const focusLng = focus?.center[0] ?? null;
  const focusLat = focus?.center[1] ?? null;
  const focusZoom = focus?.zoom ?? null;
  useEffect(() => {
    goTo(viewFor(focus), !reduce);
    // `focus` is recreated each render; depend on its primitive parts instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLng, focusLat, focusZoom, reduce, goTo]);

  // Clear any pending timer on unmount.
  useEffect(
    () => () => {
      if (animateTimer.current !== null)
        window.clearTimeout(animateTimer.current);
    },
    [],
  );

  // react-simple-maps mistypes the d3 zoom filter param as SVGElement; it is
  // actually the source DOM event. Allowing ctrlKey events (which is how a
  // trackpad pinch is reported) re-enables pinch-zoom, which the default filter
  // blocks; non-primary mouse buttons stay ignored. The cast bridges the
  // upstream mistype without resorting to `any`.
  const allowPinchAndWheel = ((event: { button?: number }): boolean =>
    !event.button) as unknown as (element: SVGElement) => boolean;

  return (
    <div className="relative w-full overflow-hidden rounded-card border border-border bg-surface">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 150 }}
        width={800}
        height={380}
        style={{ width: "100%", height: "auto" }}
        aria-label={t("borderRun.title")}
      >
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          filterZoomEvent={allowPinchAndWheel}
          onMoveEnd={(next) => setPosition(next)}
          style={{
            transition: animating
              ? `transform ${ZOOM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
              : undefined,
          }}
        >
          <Geographies geography={WORLD_GEO_URL}>
            {({ geographies }) => {
              // Two paint passes fix the shared-border problem: in a flat list,
              // blank neighbors paint over a colored country and hide its stroke
              // on every shared edge. Rendering all blanks first, then the
              // colored countries on top, guarantees each placed country's
              // outline shows on all sides.
              const blank: MapGeography[] = [];
              const colored: { geo: MapGeography; color: CountryColor }[] = [];
              for (const geo of geographies) {
                const iso = geo.properties.iso_a3;
                const color = iso ? colors[iso] : undefined;
                if (color) colored.push({ geo, color });
                else blank.push(geo);
              }

              // Blank countries: fill === stroke so internal borders vanish;
              // only the silhouette's ocean edge reads against the background.
              const blankStyle = {
                fill: BLANK_FILL,
                stroke: BLANK_FILL,
                strokeWidth: 0.5,
                outline: "none",
              };

              return (
                <>
                  {blank.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      tabIndex={-1}
                      style={{
                        default: blankStyle,
                        hover: blankStyle,
                        pressed: blankStyle,
                      }}
                    />
                  ))}
                  {colored.map(({ geo, color }) => {
                    // Thin, light outline visible on every side (this country is
                    // painted above its neighbors).
                    const style = {
                      fill: colorVar(color),
                      stroke: "var(--br-stroke)",
                      strokeWidth: 0.5,
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
                  })}
                </>
              );
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      <button
        type="button"
        onClick={() => goTo(viewFor(focus), !reduce)}
        aria-label={t("borderRun.resetZoom")}
        title={t("borderRun.resetZoom")}
        className="absolute right-3 top-3 rounded-card border border-border bg-surface/90 p-2 text-text-muted shadow-sm ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <LocateFixed size={18} aria-hidden />
      </button>
    </div>
  );
}
