import { describe, expect, it } from "vitest";
import {
  getLocalizedCapital,
  getLocalizedCountryName,
  pickLocalized,
} from "./localize";

const germany = {
  name: "Germany",
  name_fr: "Allemagne",
  capital: "Berlin",
  capital_fr: "Berlin",
};

const egypt = {
  name: "Egypt",
  name_fr: "Égypte",
  capital: "Cairo",
  capital_fr: "Le Caire",
};

describe("getLocalizedCountryName", () => {
  it("returns English for the en language", () => {
    expect(getLocalizedCountryName(germany, "en")).toBe("Germany");
  });

  it("returns French for the fr language", () => {
    expect(getLocalizedCountryName(germany, "fr")).toBe("Allemagne");
  });
});

describe("getLocalizedCapital", () => {
  it("returns English for the en language", () => {
    expect(getLocalizedCapital(egypt, "en")).toBe("Cairo");
  });

  it("returns French for the fr language", () => {
    expect(getLocalizedCapital(egypt, "fr")).toBe("Le Caire");
  });

  it("returns the same value when both languages share it", () => {
    expect(getLocalizedCapital(germany, "fr")).toBe("Berlin");
  });
});

describe("pickLocalized fallback", () => {
  it("falls back to English when the French field is empty", () => {
    expect(pickLocalized("Germany", "", "fr")).toBe("Germany");
    expect(pickLocalized("Germany", "   ", "fr")).toBe("Germany");
  });

  it("never uses French for the en language", () => {
    expect(pickLocalized("Cairo", "Le Caire", "en")).toBe("Cairo");
  });
});
