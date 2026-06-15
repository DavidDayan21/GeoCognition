import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getContinentBreakdown } from "../../api/tauri-api";
import { continentMasteryPercent } from "../../lib/stats";
import { useAsync } from "../../lib/use-async";
import { tooltipStyle, useChartColors } from "./chart-theme";
import { StatPlaceholder } from "./StatPlaceholder";

/** Short axis labels so long continent names don't overlap. */
const SHORT_NAME: Record<string, string> = {
  "North America": "N. America",
  "South America": "S. America",
};

/** Mastery percentage per continent on a 6-axis radar. */
export function ContinentRadar() {
  const { data, status } = useAsync(() => getContinentBreakdown(), 0);
  const colors = useChartColors();

  if (status === "loading") {
    return <StatPlaceholder>Loading…</StatPlaceholder>;
  }
  if (status === "error" || !data) {
    return (
      <StatPlaceholder>Couldn&apos;t load continent mastery.</StatPlaceholder>
    );
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
          tickFormatter={(name: string) => SHORT_NAME[name] ?? name}
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
          formatter={(value) => [`${value}%`, "Mastered"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
