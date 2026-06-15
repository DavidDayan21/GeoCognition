import { describe, expect, it } from "vitest";
import { CONTINENTS, sortContinents } from "./continents";

describe("sortContinents", () => {
  it("reorders into canonical continent order", () => {
    expect(sortContinents(["Oceania", "Africa", "Asia"])).toEqual([
      "Africa",
      "Asia",
      "Oceania",
    ]);
  });

  it("drops values that are not known continents", () => {
    expect(sortContinents(["Asia", "Atlantis"])).toEqual(["Asia"]);
  });

  it("returns every continent when all are present", () => {
    expect(sortContinents([...CONTINENTS])).toEqual([...CONTINENTS]);
  });
});
