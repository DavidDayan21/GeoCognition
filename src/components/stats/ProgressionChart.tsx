import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getProgression } from "../../api/tauri-api";
import { formatDayTick } from "../../lib/format";
import { useAsync } from "../../lib/use-async";
import { tooltipStyle, useChartColors } from "./chart-theme";
import { StatPlaceholder } from "./StatPlaceholder";

const DAYS = 30;

/** Daily accuracy over the last 30 days (Recharts line). */
export function ProgressionChart() {
  const { data, status } = useAsync(() => getProgression(DAYS), DAYS);
  const colors = useChartColors();

  if (status === "loading") {
    return <StatPlaceholder>Loading…</StatPlaceholder>;
  }
  if (status === "error") {
    return <StatPlaceholder>Couldn&apos;t load progression.</StatPlaceholder>;
  }
  if (!data || data.length === 0) {
    return (
      <StatPlaceholder>
        Answer questions on a few days to see your accuracy trend.
      </StatPlaceholder>
    );
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
          tickFormatter={formatDayTick}
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
          labelFormatter={(label) => formatDayTick(String(label))}
          formatter={(value) => [`${value}%`, "Accuracy"]}
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
