import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Segmented } from "../components/ui/Segmented";
import type { SegmentedOption } from "../components/ui/Segmented";
import { pageVariants } from "../lib/animations";
import { useSettingsStore } from "../store/settings-store";
import type { FuzzyTolerance, Theme } from "../types/domain";

const APP_VERSION = "0.1.0";
const REPO_URL = "https://github.com/DavidDayan21/GeoCognition";

const FUZZY_DESCRIPTION_KEY: Record<FuzzyTolerance, string> = {
  strict: "settings.fuzzyStrictDesc",
  normal: "settings.fuzzyNormalDesc",
  lenient: "settings.fuzzyLenientDesc",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        )}
      </div>
      {children}
    </Card>
  );
}

/** Settings: theme, fuzzy tolerance, reset stats, about. */
export default function SettingsPage() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const status = useSettingsStore((s) => s.status);
  const load = useSettingsStore((s) => s.load);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFuzzyTolerance = useSettingsStore((s) => s.setFuzzyTolerance);
  const resetStats = useSettingsStore((s) => s.resetStats);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  const themeOptions: ReadonlyArray<SegmentedOption<Theme>> = [
    { value: "light", label: t("settings.light") },
    { value: "dark", label: t("settings.dark") },
    { value: "system", label: t("settings.system") },
  ];

  const fuzzyOptions: ReadonlyArray<SegmentedOption<FuzzyTolerance>> = [
    { value: "strict", label: t("settings.strict") },
    { value: "normal", label: t("settings.normal") },
    { value: "lenient", label: t("settings.lenient") },
  ];

  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-3xl px-6 py-10"
    >
      <header className="mb-8 flex items-center gap-3">
        <Link
          to="/"
          aria-label={t("nav.back")}
          className="rounded-card p-2 text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <h1 className="font-display text-4xl text-text">
          {t("settings.title")}
        </h1>
      </header>

      {!settings ? (
        <div
          className="h-4 w-40 animate-pulse rounded-full bg-surface-2"
          role="status"
          aria-label={t("settings.loading")}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Section title={t("settings.appearance")}>
            <Segmented
              ariaLabel={t("settings.theme")}
              options={themeOptions}
              value={settings.theme}
              onChange={setTheme}
            />
          </Section>

          <Section
            title={t("settings.answerMatching")}
            description={t(FUZZY_DESCRIPTION_KEY[settings.fuzzy_tolerance])}
          >
            <Segmented
              ariaLabel={t("settings.fuzzyTolerance")}
              options={fuzzyOptions}
              value={settings.fuzzy_tolerance}
              onChange={setFuzzyTolerance}
            />
          </Section>

          <Section
            title={t("settings.data")}
            description={t("settings.dataDesc")}
          >
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              {t("settings.resetStats")}
            </Button>
          </Section>

          <Section title={t("settings.about")}>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">{t("settings.version")}</dt>
                <dd className="text-text">{APP_VERSION}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">{t("settings.license")}</dt>
                <dd className="text-text">MIT</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">{t("settings.source")}</dt>
                <dd>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded text-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t("settings.github")}
                  </a>
                </dd>
              </div>
            </dl>
          </Section>
        </div>
      )}

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t("settings.resetTitle")}
      >
        <p className="mb-6 text-sm text-text-muted">
          {t("settings.resetBody")}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            {t("settings.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void resetStats();
              setConfirmReset(false);
            }}
          >
            {t("settings.resetConfirm")}
          </Button>
        </div>
      </Modal>
    </motion.main>
  );
}
