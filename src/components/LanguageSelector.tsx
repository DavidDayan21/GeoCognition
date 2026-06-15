/**
 * Language selector button in the Home page header.
 *
 * Shows the active language as a flag icon. Clicking opens a small dropdown
 * with two options. Selecting a language updates the visible flag and calls
 * `onChange` — but NO translation layer is wired yet. All UI text stays in
 * English until a full i18n pass replaces these string literals.
 *
 * TODO(i18n): wire onChange to a real translation context / i18next instance
 *             and replace every hardcoded string with t() calls.
 */
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Language = "en" | "fr";

const LANGUAGES: ReadonlyArray<{
  readonly code: Language;
  readonly name: string;
  readonly flag: string;
}> = [
  { code: "en", name: "English", flag: "/flags/gb.svg" },
  { code: "fr", name: "Français", flag: "/flags/fr.svg" },
];

export interface LanguageSelectorProps {
  onChange: (lang: Language) => void;
}

/** Non-functional i18n placeholder — see file-level TODO above. */
export function LanguageSelector({ onChange }: LanguageSelectorProps) {
  const [current, setCurrent] = useState<Language>("en");
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
    setCurrent(lang);
    setOpen(false);
    onChange(lang);
  }

  const activeLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-sm text-text-muted ease-calm transition-colors duration-150 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${activeLang.name}`}
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
          aria-label="Select language"
          className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-card border border-border bg-surface shadow-md"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={current === lang.code}
              onClick={() => select(lang.code)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <img
                src={lang.flag}
                alt=""
                aria-hidden
                className="h-3.5 w-5 rounded-sm object-cover"
              />
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
