import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getForgettingCurve } from "../../api/tauri-api";
import { buildForgettingSeries } from "../../lib/stats";
import { useAsync } from "../../lib/use-async";
import { tooltipStyle, useChartColors } from "./chart-theme";
import { StatPlaceholder } from "./StatPlaceholder";

/**
 * Observed recall rate by days-since-last-review (scatter), overlaid with a
 * theoretical Ebbinghaus curve (dashed line).
 */
export function ForgettingCurve() {
  const { data, status } = useAsync(() => getForgettingCurve(), 0);
  const colors = useChartColors();

  if (status === "loading") {
    return <StatPlaceholder>Loading…</StatPlaceholder>;
  }
  if (status === "error") {
    return <StatPlaceholder>Couldn&apos;t load the curve.</StatPlaceholder>;
  }

  const series = buildForgettingSeries(data ?? []);
  if (series.length === 0) {
    return (
      <StatPlaceholder>
        Review the same cards across different days to see your retention.
      </StatPlaceholder>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart
        data={series}
        margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
      >
        <CartesianGrid
          stroke={colors["--border"]}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          type="number"
          domain={[0, "dataMax"]}
          allowDecimals={false}
          tick={{ fill: colors["--text-muted"], fontSize: 12 }}
          stroke={colors["--border"]}
          label={{
            value: "Days since last review",
            position: "insideBottom",
            offset: -2,
            fill: colors["--text-muted"],
            fontSize: 11,
          }}
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
          labelFormatter={(label) => `Day ${label}`}
          formatter={(value, name) => [
            value === null ? "—" : `${value}%`,
            name === "observed" ? "Observed" : "Ebbinghaus",
          ]}
        />
        <Line
          type="monotone"
          dataKey="theoretical"
          stroke={colors["--text-muted"]}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          isAnimationActive={false}
        />
        <Scatter
          dataKey="observed"
          fill={colors["--accent"]}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
