/**
 * Language selector in the Home page header.
 *
 * Shows the active language as a flag icon. Clicking opens a small dropdown
 * with the two supported languages. Selecting one switches the i18next
 * language immediately and persists the choice through the settings store
 * (`setLanguage` → `update_settings`), so it survives a reload.
 */
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../types/domain";

const LANGUAGES: ReadonlyArray<{
  readonly code: Language;
  readonly nameKey: "language.english" | "language.french";
  readonly flag: string;
}> = [
  { code: "en", nameKey: "language.english", flag: "/flags/gb.svg" },
  { code: "fr", nameKey: "language.french", flag: "/flags/fr.svg" },
];

export interface LanguageSelectorProps {
  /** Called with the newly selected language. */
  onChange: (lang: Language) => void;
}

export function LanguageSelector({ onChange }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  // The active language is i18next's, not the (async) settings — so the
  // selector reflects the change immediately, even before settings load.
  const value: Language = i18n.language === "fr" ? "fr" : "en";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function select(lang: Language) {
    setOpen(false);
    if (lang !== value) onChange(lang);
  }

  const activeLang = LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-sm text-text-muted ease-calm transition-colors duration-150 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("language.label", { name: t(activeLang.nameKey) })}
      >
        <img
          src={activeLang.flag}
          alt=""
          aria-hidden
          className="h-3.5 w-5 rounded-sm object-cover"
        />
        <ChevronDown size={12} aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("language.select")}
          className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-card border border-border bg-surface shadow-md"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={value === lang.code}
              onClick={() => select(lang.code)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <img
                src={lang.flag}
                alt=""
                aria-hidden
                className="h-3.5 w-5 rounded-sm object-cover"
              />
              {t(lang.nameKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
