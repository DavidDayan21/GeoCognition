import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { DURATION, EASE_CALM } from "../../lib/animations";
import { formatNextReview } from "../../lib/format";
import type { AnswerResult } from "../../types/domain";

export interface FeedbackLayerProps {
  result: AnswerResult;
  /** The text the user submitted, shown struck-through on a near miss. */
  userInput: string;
}

/**
 * Post-submit feedback: a green check for an exact answer (quality 5), an
 * amber near-miss reveal (quality 3), or a red reveal with a shake for a
 * wrong answer (quality 0). Honors `prefers-reduced-motion`.
 */
export function FeedbackLayer({ result, userInput }: FeedbackLayerProps) {
  const reduce = useReducedMotion();

  if (result.quality === 5) {
    return (
      <motion.div
        className="flex flex-col items-center gap-2 text-success"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: DURATION.base, ease: EASE_CALM }}
      >
        <Check size={48} strokeWidth={2.5} aria-hidden />
        <span className="text-sm font-medium">Correct</span>
      </motion.div>
    );
  }

  const isFuzzy = result.quality === 3;
  return (
    <motion.div
      className="flex flex-col items-center gap-3 text-center"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={
        isFuzzy || reduce
          ? { opacity: 1, scale: 1, x: 0 }
          : { opacity: 1, scale: 1, x: [0, -8, 8, -6, 6, -3, 0] }
      }
      transition={{
        duration: isFuzzy ? DURATION.base : DURATION.slow,
        ease: EASE_CALM,
      }}
    >
      <span
        className={`text-sm font-medium ${isFuzzy ? "text-warning" : "text-error"}`}
      >
        {isFuzzy ? "Close" : "Not quite"}
      </span>
      {userInput.trim() && (
        <span className="text-base text-text-muted line-through">
          {userInput}
        </span>
      )}
      <span className="font-display text-4xl text-text">
        {result.correct_answer}
      </span>
      <span className="text-xs text-text-muted">
        Next review {formatNextReview(result.interval_days)}
      </span>
      <span className="text-xs text-text-muted">Press Enter to continue</span>
    </motion.div>
  );
}
