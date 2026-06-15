import { getGlobalStats } from "../../api/tauri-api";
import { formatPercent } from "../../lib/format";
import { useAsync } from "../../lib/use-async";
import { Card } from "../ui/Card";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6";

/** Lifetime totals: mastered, seen, answers, accuracy, current/best streak. */
export function GlobalStatsStrip() {
  const { data, status } = useAsync(() => getGlobalStats(), 0);

  if (status === "error") {
    return (
      <Card className="p-6 text-sm text-text-muted">
        Couldn&apos;t load your stats.
      </Card>
    );
  }

  if (!data) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }, (_, index) => (
          <Card
            key={index}
            className="h-[5.25rem] animate-pulse bg-surface-2"
          />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Mastered", value: String(data.total_mastered) },
    { label: "Countries seen", value: String(data.countries_seen) },
    { label: "Answers", value: String(data.total_answers) },
    {
      label: "Accuracy",
      value:
        data.total_answers === 0 ? "—" : formatPercent(data.lifetime_accuracy),
    },
    { label: "Current streak", value: String(data.current_streak) },
    { label: "Best streak", value: String(data.longest_streak) },
  ];

  return (
    <div className={GRID}>
      {items.map((item) => (
        <Card key={item.label} className="flex flex-col gap-1 p-4">
          <span className="font-display text-3xl tabular-nums text-text">
            {item.value}
          </span>
          <span className="text-xs text-text-muted">{item.label}</span>
        </Card>
      ))}
    </div>
  );
}
