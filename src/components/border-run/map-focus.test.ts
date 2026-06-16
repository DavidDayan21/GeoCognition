import { describe, expect, it } from "vitest";
import { computeBorderRunFocus, greatCircleKm } from "./map-focus";

// Representative coordinates (degrees) from countries.json.
const PORTUGAL = { lat: 39.4, lng: -8.2 };
const FRANCE = { lat: 46.2, lng: 2.2 };
const JAPAN = { lat: 36.2, lng: 138.3 };

describe("greatCircleKm", () => {
  it("is zero for identical points", () => {
    expect(greatCircleKm(PORTUGAL, PORTUGAL)).toBeCloseTo(0, 5);
  });

  it("matches a known distance within tolerance", () => {
    // Portugal ↔ France is roughly 1100 km.
    expect(greatCircleKm(PORTUGAL, FRANCE)).toBeGreaterThan(900);
    expect(greatCircleKm(PORTUGAL, FRANCE)).toBeLessThan(1400);
  });
});

describe("computeBorderRunFocus", () => {
  it("frames two nearby countries with a zoomed-in centered view", () => {
    const focus = computeBorderRunFocus(PORTUGAL, FRANCE);
    expect(focus).not.toBeNull();
    expect(focus!.zoom).toBeGreaterThan(1);
    expect(focus!.zoom).toBeLessThanOrEqual(8);
    // Center is the midpoint of the endpoints.
    expect(focus!.center[0]).toBeCloseTo((-8.2 + 2.2) / 2, 5);
    expect(focus!.center[1]).toBeCloseTo((39.4 + 46.2) / 2, 5);
  });

  it("returns null when the longitude span exceeds the cap", () => {
    // Portugal → Japan spans ~146° of longitude.
    expect(computeBorderRunFocus(PORTUGAL, JAPAN)).toBeNull();
  });

  it("returns null when the great-circle distance exceeds the cap", () => {
    // Same longitude, but ~120° of latitude apart (~13,000 km).
    const south = { lat: -60, lng: 10 };
    const north = { lat: 60, lng: 10 };
    expect(Math.abs(south.lng - north.lng)).toBeLessThan(120);
    expect(computeBorderRunFocus(south, north)).toBeNull();
  });

  it("zooms in tighter for closer countries than for farther ones", () => {
    const near = computeBorderRunFocus(PORTUGAL, { lat: 40.4, lng: -3.7 }); // Spain
    const far = computeBorderRunFocus(PORTUGAL, { lat: 52.1, lng: 5.3 }); // ~Netherlands
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(near!.zoom).toBeGreaterThanOrEqual(far!.zoom);
  });
});
