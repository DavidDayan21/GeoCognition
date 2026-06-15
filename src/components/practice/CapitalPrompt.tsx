import { useTranslation } from "react-i18next";

/** Capital-mode question: shows the country; the user types its capital. */
export function CapitalPrompt({ countryName }: { countryName: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-xs uppercase tracking-widest text-text-muted">
        {t("practice.capitalOf")}
      </span>
      <h2 className="font-display text-5xl leading-tight text-text sm:text-6xl">
        {countryName}
      </h2>
    </div>
  );
}
