import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTranslation } from "react-i18next";
import { getContinentBreakdown } from "../../api/tauri-api";
import { continentMasteryPercent } from "../../lib/stats";
import { useAsync } from "../../lib/use-async";
import { tooltipStyle, useChartColors } from "./chart-theme";
import { StatPlaceholder } from "./StatPlaceholder";

/** Continents that need a shortened axis label so long names don't overlap. */
const SHORT_KEY: Record<string, string> = {
  "North America": "continents.shortNorthAmerica",
  "South America": "continents.shortSouthAmerica",
};

/** Mastery percentage per continent on a 6-axis radar. */
export function ContinentRadar() {
  const { t } = useTranslation();
  const { data, status } = useAsync(() => getContinentBreakdown(), 0);
  const colors = useChartColors();

  /** Localized, possibly-shortened axis label for a continent. */
  const axisLabel = (name: string): string =>
    SHORT_KEY[name] ? t(SHORT_KEY[name]) : t(`continents.${name}`, name);

  if (status === "loading") {
    return <StatPlaceholder>{t("stats.loading")}</StatPlaceholder>;
  }
  if (status === "error" || !data) {
    return <StatPlaceholder>{t("stats.continentLoadError")}</StatPlaceholder>;
  }

  const points = data.map((stat) => ({
    continent: stat.continent,
    mastery: continentMasteryPercent(stat),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={points} outerRadius="70%">
        <PolarGrid stroke={colors["--border"]} />
        <PolarAngleAxis
          dataKey="continent"
          tickFormatter={axisLabel}
          tick={{ fill: colors["--text-muted"], fontSize: 11 }}
        />
        <PolarRadiusAxis
          domain={[0, 100]}
          angle={90}
          tickFormatter={(value) => `${value}%`}
          tick={{ fill: colors["--text-muted"], fontSize: 10 }}
        />
        <Radar
          dataKey="mastery"
          stroke={colors["--accent"]}
          fill={colors["--accent"]}
          fillOpacity={0.25}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={tooltipStyle(colors)}
          labelFormatter={(label) => axisLabel(String(label))}
          formatter={(value) => [`${value}%`, t("stats.tooltipMastered")]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
