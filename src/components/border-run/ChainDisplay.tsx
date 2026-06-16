import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { colorVar, type CountryColor } from "./border-run-colors";

export interface ChainDisplayProps {
  /** Ordered ISO alpha-3 codes: start, accepted guesses, then end. */
  steps: string[];
  /** ISO alpha-3 → color classification. */
  colors: Record<string, CountryColor>;
  /** Resolves an ISO alpha-3 to its display name in the active language. */
  nameOf: (iso3: string) => string;
}

/** A single colored country chip in the route. */
function Chip({ label, color }: { label: string; color: CountryColor }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-sm font-medium text-white"
      style={{ backgroundColor: colorVar(color) }}
    >
      {label}
    </span>
  );
}

/**
 * The player's route as a left-to-right sequence of colored chips:
 * start → accepted guesses → end. Guesses inherit their map color (green for
 * on-path, orange for detour); endpoints keep the start/end accents.
 */
export function ChainDisplay({ steps, colors, nameOf }: ChainDisplayProps) {
  const { t } = useTranslation();

  return (
    <ul
      aria-label={t("borderRun.route")}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {steps.map((iso3, index) => (
        <li key={iso3} className="flex items-center gap-2">
          {index > 0 && (
            <ArrowRight size={16} className="text-text-muted" aria-hidden />
          )}
          <Chip label={nameOf(iso3)} color={colors[iso3] ?? "detour"} />
        </li>
      ))}
    </ul>
  );
}
