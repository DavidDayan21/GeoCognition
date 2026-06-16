import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getAllCountries } from "../api/tauri-api";
import { AttemptsCounter } from "../components/border-run/AttemptsCounter";
import { BorderRunMap } from "../components/border-run/BorderRunMap";
import { BorderRunResult } from "../components/border-run/BorderRunResult";
import { computeBorderRunFocus } from "../components/border-run/map-focus";
import { ChainDisplay } from "../components/border-run/ChainDisplay";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { pageVariants } from "../lib/animations";
import { useAsync } from "../lib/use-async";
import { useBorderRunStore } from "../store/border-run-store";
import { useSettingsStore } from "../store/settings-store";
import { useToastStore } from "../store/toast-store";
import type { Country, GuessOutcomeDto } from "../types/domain";

/** How long the input keeps its pulse ring after a guess. */
const PULSE_MS = 600;

/** Country flag + name, used for the start and end endpoints in the top bar. */
function Endpoint({
  iso2,
  name,
  colorVarName,
}: {
  iso2: string | null;
  name: string;
  colorVarName: string;
}) {
  return (
    <span className="flex items-center gap-2">
      {iso2 && (
        <img
          src={`/flags/${iso2}.svg`}
          alt=""
          draggable={false}
          className="h-4 w-6 rounded-sm border border-border object-cover"
        />
      )}
      <span className="font-medium" style={{ color: `var(${colorVarName})` }}>
        {name}
      </span>
    </span>
  );
}

/** Active Border Run game: top bar, mystery map, guess input, and route. */
export default function BorderRunPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isFr = i18n.language === "fr";

  const difficulty = useSettingsStore(
    (s) => s.settings?.border_run_difficulty ?? "medium",
  );
  const settingsStatus = useSettingsStore((s) => s.status);

  const status = useBorderRunStore((s) => s.status);
  const game = useBorderRunStore((s) => s.game);
  const colors = useBorderRunStore((s) => s.colors);
  const start = useBorderRunStore((s) => s.start);
  const guess = useBorderRunStore((s) => s.guess);
  const revealPath = useBorderRunStore((s) => s.revealPath);
  const reset = useBorderRunStore((s) => s.reset);

  const showToast = useToastStore((s) => s.show);

  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [pulse, setPulse] = useState<"ok" | "bad" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Country lookup for names + flags. Loaded once; never changes.
  const { data: countries } = useAsync(() => getAllCountries(), 0);
  const byIso = useMemo(() => {
    const map = new Map<string, Country>();
    for (const c of countries ?? []) map.set(c.iso_alpha3, c);
    return map;
  }, [countries]);

  const nameOf = (iso3: string): string => {
    const c = byIso.get(iso3);
    if (!c) return iso3.toUpperCase();
    return isFr ? c.name_fr : c.name;
  };
  const iso2Of = (iso3: string): string | null =>
    byIso.get(iso3)?.iso_alpha2 ?? null;

  // Auto-zoom view for the active pair: the bounding region of start + end,
  // or null (full world) when they're too far apart or not yet loaded.
  const focus = useMemo(() => {
    if (!game) return null;
    const s = byIso.get(game.start);
    const e = byIso.get(game.end);
    if (!s || !e) return null;
    return computeBorderRunFocus(
      { lat: s.lat, lng: s.lng },
      { lat: e.lat, lng: e.lng },
    );
  }, [game, byIso]);

  // Start exactly one game per page visit, once settings are available.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    if (settingsStatus === "loading" || settingsStatus === "idle") return;
    startedRef.current = true;
    void start(difficulty);
  }, [settingsStatus, difficulty, start]);

  // Drop the in-memory game when leaving the route.
  useEffect(() => () => reset(), [reset]);

  // Auto-clear the input pulse ring.
  useEffect(() => {
    if (!pulse) return;
    const id = window.setTimeout(() => setPulse(null), PULSE_MS);
    return () => window.clearTimeout(id);
  }, [pulse]);

  const inProgress = game?.status === "in_progress";
  const gameStatus = game?.status;

  // Refocus the input whenever it becomes usable again.
  useEffect(() => {
    if (inProgress && !submitting) inputRef.current?.focus();
  }, [inProgress, submitting]);

  // When a game ends, surface the result overlay; on a loss, reveal the path.
  useEffect(() => {
    if (!gameStatus || gameStatus === "in_progress") return;
    setShowResult(true);
    if (gameStatus === "lost") void revealPath();
  }, [gameStatus, revealPath]);

  function playAgain() {
    if (!game) return;
    setShowResult(false);
    setValue("");
    setPulse(null);
    void start(game.difficulty);
  }

  function reactToOutcome(outcome: GuessOutcomeDto) {
    const { kind, iso3 } = outcome;
    const country = iso3 ? nameOf(iso3) : "";
    switch (kind) {
      case "accepted":
      case "won":
      case "lost":
        // Every recognized guess is placed, so it always reads as "ok".
        setPulse("ok");
        break;
      case "not_recognized":
        setPulse("bad");
        showToast(t("borderRun.input.notRecognized"), "error");
        break;
      case "already_in_chain":
        setPulse("bad");
        showToast(t("borderRun.input.alreadyInChain", { country }), "info");
        break;
    }
  }

  async function onSubmit() {
    const trimmed = value.trim();
    if (!trimmed || submitting || !inProgress) return;
    setSubmitting(true);
    const outcome = await guess(trimmed);
    setSubmitting(false);
    if (!outcome) {
      showToast(t("toast.genericError"), "error");
      return;
    }
    setValue("");
    reactToOutcome(outcome);
  }

  const steps = game ? [game.start, ...game.chain, game.end] : [];
  const ended = game != null && game.status !== "in_progress";
  // The route is optimal when every placed guess sits on a shortest path —
  // i.e. nothing landed off it (orange "detour") or away from it (red
  // "disconnected").
  const optimal = !Object.values(colors).some(
    (c) => c === "detour" || c === "disconnected",
  );
  const pulseRing =
    pulse === "ok"
      ? "ring-2 ring-success"
      : pulse === "bad"
        ? "ring-2 ring-error"
        : "";

  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-8"
    >
      {/* Top bar: exit · start → end · attempts */}
      <header className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label={t("borderRun.exit")}
          className="rounded-card p-2 text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={20} aria-hidden />
        </button>

        {game && (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-3 text-sm">
            <Endpoint
              iso2={iso2Of(game.start)}
              name={nameOf(game.start)}
              colorVarName="--br-start"
            />
            <ArrowRight size={16} className="text-text-muted" aria-hidden />
            <Endpoint
              iso2={iso2Of(game.end)}
              name={nameOf(game.end)}
              colorVarName="--br-end"
            />
          </div>
        )}

        {game && (
          <AttemptsCounter
            remaining={game.attempts_remaining}
            limit={game.attempts_limit}
          />
        )}
      </header>

      {/* Loading / error states for game setup */}
      {status === "loading" && (
        <div
          className="h-80 animate-pulse rounded-card bg-surface-2"
          role="status"
          aria-label={t("borderRun.loading")}
        />
      )}
      {status === "error" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-text-muted">{t("borderRun.loadError")}</p>
          <Button onClick={() => void start(difficulty)}>
            {t("borderRun.retry")}
          </Button>
        </div>
      )}

      {/* Active game */}
      {status === "ready" && game && (
        <>
          <BorderRunMap colors={colors} focus={focus} />

          {/* Once the result overlay is dismissed, keep replay controls handy. */}
          {ended && !showResult && (
            <div className="flex flex-col items-center gap-3">
              <p className="font-display text-2xl text-text">
                {t(
                  game.status === "won"
                    ? "borderRun.win.title"
                    : "borderRun.lose.title",
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate("/")}>
                  {t("borderRun.changeDifficulty")}
                </Button>
                <Button onClick={playAgain}>{t("borderRun.playAgain")}</Button>
              </div>
            </div>
          )}

          {!ended && (
            <form
              className="mx-auto w-full max-w-md"
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
              <Input
                ref={inputRef}
                value={value}
                disabled={submitting}
                placeholder={t("borderRun.input.placeholder")}
                aria-label={t("borderRun.input.placeholder")}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                onChange={(event) => setValue(event.target.value)}
                className={`text-center text-lg transition-shadow ${pulseRing}`}
              />
            </form>
          )}

          {steps.length > 0 && (
            <ChainDisplay steps={steps} colors={colors} nameOf={nameOf} />
          )}

          {ended && (
            <BorderRunResult
              open={showResult}
              game={game}
              optimal={optimal}
              onClose={() => setShowResult(false)}
              onPlayAgain={playAgain}
              onChangeDifficulty={() => navigate("/")}
            />
          )}
        </>
      )}
    </motion.main>
  );
}
