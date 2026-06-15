import { describe, expect, it } from "vitest";
import type { Country, CountryMastery } from "../../types/domain";
import {
  buildContinentByIso,
  buildMasteryByIso,
  continentForGeography,
  geoFillState,
  masteryFill,
} from "./map-utils";

function country(iso_alpha3: string, continent: string, id: number): Country {
  return {
    id,
    name: iso_alpha3.toUpperCase(),
    capital: "City",
    continent,
    iso_alpha2: iso_alpha3.slice(0, 2),
    iso_alpha3,
    lat: 0,
    lng: 0,
  };
}

const countries = [country("jpn", "Asia", 1), country("fra", "Europe", 2)];
const byIso = buildContinentByIso(countries);

describe("buildContinentByIso", () => {
  it("keys continents by lowercase alpha-3", () => {
    expect(byIso.get("jpn")).toBe("Asia");
    expect(byIso.get("fra")).toBe("Europe");
    expect(byIso.size).toBe(2);
  });
});

describe("continentForGeography", () => {
  it("resolves a known country's continent", () => {
    expect(
      continentForGeography(
        { rsmKey: "a", properties: { iso_a3: "jpn" } },
        byIso,
      ),
    ).toBe("Asia");
  });

  it("returns null for a feature outside the quiz set", () => {
    expect(
      continentForGeography(
        { rsmKey: "b", properties: { iso_a3: "grl" } },
        byIso,
      ),
    ).toBeNull();
  });

  it("returns null when the feature has no ISO code", () => {
    expect(
      continentForGeography({ rsmKey: "c", properties: {} }, byIso),
    ).toBeNull();
  });
});

describe("geoFillState", () => {
  it("is selected when the continent is in the selection", () => {
    expect(geoFillState("Asia", ["Asia", "Europe"])).toBe("selected");
  });

  it("is deselected when the continent is not selected", () => {
    expect(geoFillState("Africa", ["Asia"])).toBe("deselected");
  });

  it("is inactive for non-quiz features", () => {
    expect(geoFillState(null, ["Asia"])).toBe("inactive");
  });
});

describe("buildMasteryByIso", () => {
  it("keys easiness factor by lowercase alpha-3, keeping null for unseen", () => {
    const mastery: CountryMastery[] = [
      {
        country_id: 1,
        name: "Japan",
        iso_alpha2: "jp",
        iso_alpha3: "jpn",
        continent: "Asia",
        ef: 2.7,
        repetitions: 4,
        total_attempts: 5,
      },
      {
        country_id: 2,
        name: "France",
        iso_alpha2: "fr",
        iso_alpha3: "fra",
        continent: "Europe",
        ef: null,
        repetitions: 0,
        total_attempts: 0,
      },
    ];
    const byIso = buildMasteryByIso(mastery);
    expect(byIso.get("jpn")).toBe(2.7);
    expect(byIso.get("fra")).toBeNull();
  });
});

describe("masteryFill", () => {
  it("uses the neutral fill for unseen cards", () => {
    expect(masteryFill(null)).toBe("var(--surface-2)");
    expect(masteryFill(undefined)).toBe("var(--surface-2)");
  });

  it("bins easiness factor across the four mastery colors", () => {
    expect(masteryFill(1.4)).toBe("var(--mastery-0)");
    expect(masteryFill(2.0)).toBe("var(--mastery-1)");
    expect(masteryFill(2.5)).toBe("var(--mastery-2)");
    expect(masteryFill(2.9)).toBe("var(--mastery-3)");
  });
});
