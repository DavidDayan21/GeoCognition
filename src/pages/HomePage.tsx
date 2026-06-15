import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ChartColumn,
  Flame,
  Play,
  Settings,
  Target,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getGlobalStats } from "../api/tauri-api";
import { WorldMap } from "../components/map/WorldMap";
import { Button } from "../components/ui/Button";
import { Toggle } from "../components/ui/Toggle";
import { LanguageSelector } from "../components/LanguageSelector";
import { EASE_CALM } from "../lib/animations";
import { formatPercent } from "../lib/format";
import { useAsync } from "../lib/use-async";
import { useIntroStore } from "../store/intro-store";
import { useSettingsStore } from "../store/settings-store";
import type { QuestionMode } from "../types/domain";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const contentContainer: Variants = {
  initial: {},
  animate: (withDelay: boolean) => ({
    transition: {
      staggerChildren: 0.06,
      delayChildren: withDelay ? 0.3 : 0.04,
    },
  }),
};

const contentItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_CALM },
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NavIcon({
  to,
  label,
  children,
}: {
  to: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="rounded-card p-2 text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </Link>
  );
}

function ModeToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Toggle
        label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="text-sm text-text">{label}</span>
    </div>
  );
}

function HomeStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted" aria-hidden>
        {icon}
      </span>
      <span className="text-sm">
        <span className="font-semibold tabular-nums text-text">{value}</span>{" "}
        <span className="text-text-muted">{label}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** Home page: continent map, mode toggles, Start CTA, and lifetime stats. */
export default function HomePage() {
  const navigate = useNavigate();

  // Settings
  const settings = useSettingsStore((s) => s.settings);
  const status = useSettingsStore((s) => s.status);
  const load = useSettingsStore((s) => s.load);
  const toggleContinent = useSettingsStore((s) => s.toggleContinent);
  const setMode = useSettingsStore((s) => s.setMode);

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  // Stats strip
  const { data: stats } = useAsync(() => getGlobalStats(), 0);

  // Intro animation
  const { hasPlayedIntro, markIntroPlayed } = useIntroStore();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const skipIntro = hasPlayedIntro || prefersReducedMotion;

  const [showOverlay, setShowOverlay] = useState(() => !skipIntro);
  const [showContent, setShowContent] = useState(() => skipIntro);

  useEffect(() => {
    if (skipIntro) return;

    // t=600ms: dismiss overlay + mount content; layoutId morph begins
    const t1 = setTimeout(() => {
      setShowOverlay(false);
      setShowContent(true);
    }, 600);

    // t=1800ms: mark intro done so return navigation won't replay it
    const t2 = setTimeout(() => markIntroPlayed(), 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [skipIntro, markIntroPlayed]);

  // The stagger container uses a 300ms delayChildren during the intro so that
  // content appears while the title morph (800ms) is still in flight.
  const isIntroSequence =
    showContent && !hasPlayedIntro && !prefersReducedMotion;

  return (
    <LayoutGroup>
      {/* ── Intro overlay: full-screen white + large centred title ── */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="geo-intro-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg"
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            <motion.h1
              layoutId="geo-title"
              className="font-display text-[96px] leading-none text-text"
              transition={{ duration: 0.8, ease: EASE_CALM }}
            >
              GeoCognition
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Home content ── */}
      {showContent && (
        <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-8 py-10">
          {/* Header: title (layoutId morph target) + nav icons + language */}
          <header className="flex items-center justify-between">
            <motion.h1
              layoutId="geo-title"
              className="font-display text-4xl text-text"
              transition={{ duration: 0.8, ease: EASE_CALM }}
            >
              GeoCognition
            </motion.h1>

            <div className="flex items-center gap-1">
              <NavIcon to="/stats" label="Stats">
                <ChartColumn size={20} aria-hidden />
              </NavIcon>
              <NavIcon to="/settings" label="Settings">
                <Settings size={20} aria-hidden />
              </NavIcon>
              <div className="ml-2">
                <LanguageSelector onChange={() => {}} />
              </div>
            </div>
          </header>

          {/* Staggered content: map → toggles/CTA → stats */}
          <motion.div
            className="flex flex-col gap-10"
            variants={contentContainer}
            custom={isIntroSequence}
            initial="initial"
            animate="animate"
          >
            {/* World map */}
            <motion.div variants={contentItem}>
              {settings ? (
                <WorldMap
                  selectedContinents={settings.selected_continents}
                  onToggleContinent={toggleContinent}
                />
              ) : (
                <div
                  className="h-80 animate-pulse rounded-card bg-surface-2"
                  role="status"
                  aria-label="Loading map"
                />
              )}
            </motion.div>

            {/* Mode toggles + Start practicing CTA */}
            <motion.div
              variants={contentItem}
              className="flex flex-col items-center gap-5"
            >
              {settings && (
                <div className="flex flex-wrap items-center justify-center gap-8">
                  <ModeToggle
                    label="Capitals"
                    checked={settings.modes_enabled.capital}
                    disabled={
                      settings.modes_enabled.capital &&
                      !settings.modes_enabled.flag
                    }
                    onChange={(checked) =>
                      setMode("capital" as QuestionMode, checked)
                    }
                  />
                  <ModeToggle
                    label="Flags"
                    checked={settings.modes_enabled.flag}
                    disabled={
                      settings.modes_enabled.flag &&
                      !settings.modes_enabled.capital
                    }
                    onChange={(checked) =>
                      setMode("flag" as QuestionMode, checked)
                    }
                  />
                </div>
              )}
              <Button
                onClick={() => navigate("/practice")}
                className="px-12 py-4 text-base font-semibold"
              >
                <Play size={20} aria-hidden />
                Start practicing
              </Button>
            </motion.div>

            {/* Lifetime stats strip */}
            <motion.div
              variants={contentItem}
              className="flex min-h-[1.5rem] flex-wrap items-center justify-center gap-x-6 gap-y-2"
            >
              {stats && stats.total_answers > 0 ? (
                <>
                  <HomeStat
                    icon={<Flame size={16} />}
                    value={String(stats.current_streak)}
                    label="streak"
                  />
                  <HomeStat
                    icon={<Trophy size={16} />}
                    value={String(stats.total_mastered)}
                    label="mastered"
                  />
                  <HomeStat
                    icon={<Target size={16} />}
                    value={formatPercent(stats.lifetime_accuracy)}
                    label="accuracy"
                  />
                </>
              ) : (
                <p className="text-sm text-text-muted">
                  {stats ? "No practice yet — start your first session." : ""}
                </p>
              )}
            </motion.div>
          </motion.div>
        </main>
      )}
    </LayoutGroup>
  );
}
