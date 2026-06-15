import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from ".";
import { FlagPrompt } from "../components/practice/FlagPrompt";
import { CapitalPrompt } from "../components/practice/CapitalPrompt";

function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>{node}</I18nextProvider>,
  );
}

afterAll(async () => {
  await i18n.changeLanguage("en");
});

describe("i18n rendering", () => {
  it("renders English UI strings by default", async () => {
    await i18n.changeLanguage("en");
    const html = render(<FlagPrompt isoAlpha2="fr" />);
    expect(html).toContain("Which country?");
  });

  it("renders French UI strings when the language is fr", async () => {
    await i18n.changeLanguage("fr");
    const flag = render(<FlagPrompt isoAlpha2="fr" />);
    expect(flag).toContain("Quel pays");

    const capital = render(<CapitalPrompt countryName="Allemagne" />);
    expect(capital).toContain("Capitale de");
    expect(capital).toContain("Allemagne");
  });
});
