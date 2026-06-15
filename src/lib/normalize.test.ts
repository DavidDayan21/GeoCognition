import { describe, expect, it } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("lowercases and trims", () => {
    expect(normalize("  Tokyo ")).toBe("tokyo");
  });

  it("strips diacritics", () => {
    expect(normalize("São Paulo")).toBe("sao paulo");
    expect(normalize("Bogotá")).toBe("bogota");
    expect(normalize("Reykjavík")).toBe("reykjavik");
  });

  it("collapses internal whitespace", () => {
    expect(normalize("New   York")).toBe("new york");
  });

  it("preserves apostrophes and non-diacritic punctuation", () => {
    expect(normalize("N'Djamena")).toBe("n'djamena");
  });
});
