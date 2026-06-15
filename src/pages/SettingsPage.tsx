import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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

const THEME_OPTIONS: ReadonlyArray<SegmentedOption<Theme>> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const FUZZY_OPTIONS: ReadonlyArray<SegmentedOption<FuzzyTolerance>> = [
  { value: "strict", label: "Strict" },
  { value: "normal", label: "Normal" },
  { value: "lenient", label: "Lenient" },
];

const FUZZY_DESCRIPTION: Record<FuzzyTolerance, string> = {
  strict: "Only exact answers count (accents and case still ignored).",
  normal: "Small typos are accepted as a near miss.",
  lenient: "More generous with typos before marking an answer wrong.",
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
          aria-label="Back to home"
          className="rounded-card p-2 text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <h1 className="font-display text-4xl text-text">Settings</h1>
      </header>

      {!settings ? (
        <div
          className="h-4 w-40 animate-pulse rounded-full bg-surface-2"
          role="status"
          aria-label="Loading settings"
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Appearance">
            <Segmented
              ariaLabel="Theme"
              options={THEME_OPTIONS}
              value={settings.theme}
              onChange={setTheme}
            />
          </Section>

          <Section
            title="Answer matching"
            description={FUZZY_DESCRIPTION[settings.fuzzy_tolerance]}
          >
            <Segmented
              ariaLabel="Fuzzy matching tolerance"
              options={FUZZY_OPTIONS}
              value={settings.fuzzy_tolerance}
              onChange={setFuzzyTolerance}
            />
          </Section>

          <Section
            title="Data"
            description="Reset clears all progress but keeps your continent and mode preferences."
          >
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              Reset all stats…
            </Button>
          </Section>

          <Section title="About">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Version</dt>
                <dd className="text-text">{APP_VERSION}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">License</dt>
                <dd className="text-text">MIT</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Source</dt>
                <dd>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded text-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    GitHub
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
        title="Reset all stats?"
      >
        <p className="mb-6 text-sm text-text-muted">
          This permanently deletes all of your SM-2 progress and answer history.
          Your continent and mode preferences are kept. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void resetStats();
              setConfirmReset(false);
            }}
          >
            Reset everything
          </Button>
        </div>
      </Modal>
    </motion.main>
  );
}
