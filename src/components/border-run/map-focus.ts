/**
 * Computes the auto-zoom view for a Border Run game from the start and end
 * country coordinates. The map zooms to the bounding region containing both
 * endpoints (with a small degree padding); when they are too far apart to make
 * zooming useful, it returns `null` so the caller shows the full world map.
 */

/** A geographic point (degrees). */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A `react-simple-maps` ZoomableGroup view: `[lng, lat]` center + zoom. */
export interface MapFocus {
  center: [number, number];
  zoom: number;
}

/** Degrees of breathing room added around the endpoints on every side. */
const PADDING_DEG = 5;
/** Above this great-circle distance, zooming doesn't help — show the world. */
const MAX_DISTANCE_KM = 8000;
/** Above this longitude span, the region is too wide — show the world. */
const MAX_LNG_SPAN_DEG = 120;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
/** Whole-world spans the viewport shows at zoom 1 (geoEqualEarth, roughly). */
const WORLD_LNG_SPAN = 360;
const WORLD_LAT_SPAN = 180;
/** Leaves a margin so the endpoints don't sit flush against the map edge. */
const FIT_MARGIN = 0.85;
const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Great-circle distance between two points, in kilometers (haversine). */
export function greatCircleKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The view that frames `start` and `end` together, or `null` when they are so
 * far apart (great-circle distance or longitude span over the caps) that
 * zooming in would hide one endpoint without helping.
 */
export function computeBorderRunFocus(
  start: LatLng,
  end: LatLng,
): MapFocus | null {
  const lngSpanRaw = Math.abs(start.lng - end.lng);
  if (lngSpanRaw > MAX_LNG_SPAN_DEG) return null;
  if (greatCircleKm(start, end) > MAX_DISTANCE_KM) return null;

  const lngSpan = lngSpanRaw + 2 * PADDING_DEG;
  const latSpan = Math.abs(start.lat - end.lat) + 2 * PADDING_DEG;
  const zoom = clamp(
    FIT_MARGIN * Math.min(WORLD_LNG_SPAN / lngSpan, WORLD_LAT_SPAN / latSpan),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  const center: [number, number] = [
    (start.lng + end.lng) / 2,
    (start.lat + end.lat) / 2,
  ];
  return { center, zoom };
}
