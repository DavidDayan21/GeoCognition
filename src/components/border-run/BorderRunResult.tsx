import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EASE_CALM } from "../../lib/animations";
import type { BorderRunGameDto } from "../../types/domain";
import { Button } from "../ui/Button";

export interface BorderRunResultProps {
  game: BorderRunGameDto;
  /** Whether the winning route used only shortest-path countries. */
  optimal: boolean;
  /** Restart the same difficulty. */
  onPlayAgain: () => void;
  /** Return to the Home setup to pick a difficulty. */
  onChangeDifficulty: () => void;
  /** Hide the bar so the player can keep contemplating the final map. */
  onDismiss: () => void;
}

/**
 * End-of-game bar pinned to the bottom-center of the screen, kept deliberately
 * compact so the final map stays visible behind it. It states the outcome in a
 * single line, then offers "Play again" (same difficulty), "Change difficulty"
 * (back to setup), and a "✕" to dismiss it. Slides up on entry, honoring
 * `prefers-reduced-motion`.
 */
export function BorderRunResult({
  game,
  optimal,
  onPlayAgain,
  onChangeDifficulty,
  onDismiss,
}: BorderRunResultProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion() ?? false;
  const won = game.status === "won";

  const message = won
    ? t(optimal ? "borderRun.win.optimal" : "borderRun.win.withDetour")
    : t("borderRun.lose.message");

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.3, ease: EASE_CALM }}
      className="fixed bottom-6 left-1/2 z-40 w-[min(92vw,36rem)] -translate-x-1/2"
    >
      <div className="flex items-center gap-3 rounded-card border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="min-w-0 flex-1 text-sm font-medium text-text">
          {message}
        </p>
        <Button variant="secondary" onClick={onChangeDifficulty}>
          {t("borderRun.changeDifficulty")}
        </Button>
        <Button onClick={onPlayAgain}>{t("borderRun.playAgain")}</Button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("borderRun.dismissResult")}
          className="rounded-card p-1.5 text-text-muted ease-calm transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </motion.div>
  );
}
