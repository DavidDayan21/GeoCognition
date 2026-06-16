import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface AttemptsCounterProps {
  remaining: number;
  limit: number;
}

/**
 * Compact "attempts left" indicator for the top bar. Because the attempt limit
 * now varies per pair (shortest-path length + 3), the warning thresholds are
 * proportional: amber once a third or less of the budget remains, red on the
 * last attempt. It also pops briefly each time the count drops (honoring
 * reduced-motion via the app's MotionConfig).
 */
export function AttemptsCounter({ remaining, limit }: AttemptsCounterProps) {
  const { t } = useTranslation();

  const tone =
    remaining <= 1
      ? "text-error"
      : limit > 0 && remaining / limit <= 0.33
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
