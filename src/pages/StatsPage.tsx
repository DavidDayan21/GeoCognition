import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MasteryHeatmap } from "../components/map/MasteryHeatmap";
import { ContinentRadar } from "../components/stats/ContinentRadar";
import { ForgettingCurve } from "../components/stats/ForgettingCurve";
import { GlobalStatsStrip } from "../components/stats/GlobalStatsStrip";
import { ProgressionChart } from "../components/stats/ProgressionChart";
import { Card } from "../components/ui/Card";
import { pageVariants } from "../lib/animations";

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {children}
    </Card>
  );
}

/** Stats: global strip, mastery heatmap, progression, forgetting, radar. */
export default function StatsPage() {
  const { t } = useTranslation();
  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-5xl px-6 py-10"
    >
      <header className="mb-8 flex items-center gap-3">
        <Link
          to="/"
          aria-label={t("nav.back")}
          className="rounded-card p-2 text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <h1 className="font-display text-4xl text-text">{t("stats.title")}</h1>
      </header>

      <div className="flex flex-col gap-6">
        <GlobalStatsStrip />

        <ChartCard
          title={t("stats.masteryMap")}
          description={t("stats.masteryMapDesc")}
        >
          <MasteryHeatmap />
        </ChartCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title={t("stats.progression")}
            description={t("stats.progressionDesc")}
          >
            <ProgressionChart />
          </ChartCard>
          <ChartCard
            title={t("stats.forgettingCurve")}
            description={t("stats.forgettingCurveDesc")}
          >
            <ForgettingCurve />
          </ChartCard>
        </div>

        <ChartCard
          title={t("stats.continentMastery")}
          description={t("stats.continentMasteryDesc")}
        >
          <ContinentRadar />
        </ChartCard>
      </div>
    </motion.main>
  );
}
