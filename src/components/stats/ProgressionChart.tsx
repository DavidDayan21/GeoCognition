import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { getProgression } from "../../api/tauri-api";
import { formatDayTick } from "../../lib/format";
import { localeOf } from "../../lib/language";
import { useAsync } from "../../lib/use-async";
import { tooltipStyle, useChartColors } from "./chart-theme";
import { StatPlaceholder } from "./StatPlaceholder";

const DAYS = 30;

/** Daily accuracy over the last 30 days (Recharts line). */
export function ProgressionChart() {
  const { t, i18n } = useTranslation();
  const locale = localeOf(i18n.language === "fr" ? "fr" : "en");
  const { data, status } = useAsync(() => getProgression(DAYS), DAYS);
  const colors = useChartColors();

  if (status === "loading") {
    return <StatPlaceholder>{t("stats.loading")}</StatPlaceholder>;
  }
  if (status === "error") {
    return <StatPlaceholder>{t("stats.progressionLoadError")}</StatPlaceholder>;
  }
  if (!data || data.length === 0) {
    return <StatPlaceholder>{t("stats.progressionEmpty")}</StatPlaceholder>;
  }

  const points = data.map((day) => ({
    date: day.date,
    accuracy: Math.round(day.accuracy * 100),
    attempts: day.attempts,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={points}
        margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
      >
        <CartesianGrid
          stroke={colors["--border"]}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => formatDayTick(value, locale)}
          tick={{ fill: colors["--text-muted"], fontSize: 12 }}
          stroke={colors["--border"]}
          minTickGap={24}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
          tick={{ fill: colors["--text-muted"], fontSize: 12 }}
          stroke={colors["--border"]}
          width={44}
        />
        <Tooltip
          contentStyle={tooltipStyle(colors)}
          labelFormatter={(label) => formatDayTick(String(label), locale)}
          formatter={(value) => [`${value}%`, t("stats.accuracy")]}
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke={colors["--accent"]}
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
