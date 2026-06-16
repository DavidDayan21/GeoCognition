import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface AttemptsCounterProps {
  remaining: number;
  limit: number;
}

/**
 * Compact "attempts left" indicator for the top bar. It turns amber when only
 * a couple of guesses remain and red on the last one, and pops briefly each
 * time the count drops (honoring reduced-motion via the app's MotionConfig).
 */
export function AttemptsCounter({ remaining, limit }: AttemptsCounterProps) {
  const { t } = useTranslation();

  const lowThreshold = Math.max(2, Math.ceil(limit * 0.25));
  const tone =
    remaining <= 1
      ? "text-error"
      : remaining <= lowThreshold
        ? "text-warning"
        : "text-text";

  return (
    <motion.span
      // Re-keying on `remaining` re-mounts the node so the pop replays per drop.
      key={remaining}
      initial={{ scale: 1.25 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`text-sm font-medium tabular-nums ${tone}`}
      aria-live="polite"
    >
      {t("borderRun.attemptsRemaining", { count: remaining })}
    </motion.span>
  );
}
