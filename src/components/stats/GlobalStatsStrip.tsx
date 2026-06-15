import { useTranslation } from "react-i18next";
import { getGlobalStats } from "../../api/tauri-api";
import { formatCount, formatPercent } from "../../lib/format";
import { localeOf } from "../../lib/language";
import { useAsync } from "../../lib/use-async";
import { Card } from "../ui/Card";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6";

/** Lifetime totals: mastered, seen, answers, accuracy, current/best streak. */
export function GlobalStatsStrip() {
  const { t, i18n } = useTranslation();
  const locale = localeOf(i18n.language === "fr" ? "fr" : "en");
  const { data, status } = useAsync(() => getGlobalStats(), 0);

  if (status === "error") {
    return (
      <Card className="p-6 text-sm text-text-muted">
        {t("stats.loadError")}
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
    {
      label: t("stats.mastered"),
      value: formatCount(data.total_mastered, locale),
    },
    {
      label: t("stats.countriesSeen"),
      value: formatCount(data.countries_seen, locale),
    },
    {
      label: t("stats.answers"),
      value: formatCount(data.total_answers, locale),
    },
    {
      label: t("stats.accuracy"),
      value:
        data.total_answers === 0
          ? "—"
          : formatPercent(data.lifetime_accuracy, locale),
    },
    {
      label: t("stats.currentStreak"),
      value: formatCount(data.current_streak, locale),
    },
    {
      label: t("stats.bestStreak"),
      value: formatCount(data.longest_streak, locale),
    },
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
