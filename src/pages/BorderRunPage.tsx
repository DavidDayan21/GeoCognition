import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { pageVariants } from "../lib/animations";

/**
 * Active Border Run game screen. Placeholder until Phase 6 builds the map,
 * input, and chain display — for now it only confirms the route and offers a
 * way back home.
 */
export default function BorderRunPage() {
  const { t } = useTranslation();
  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-4xl px-6 py-10"
    >
      <header className="mb-8 flex items-center gap-3">
        <Link
          to="/"
          aria-label={t("borderRun.exit")}
          className="rounded-card p-2 text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <h1 className="font-display text-4xl text-text">
          {t("borderRun.title")}
        </h1>
      </header>

      <p className="text-text-muted">{t("borderRun.comingSoon")}</p>
    </motion.main>
  );
}
