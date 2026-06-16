import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DURATION, EASE_CALM } from "../../lib/animations";
import { pickLocalized } from "../../lib/localize";
import type { AnswerResult, Language } from "../../types/domain";

export interface FeedbackLayerProps {
  result: AnswerResult;
  /** The text the user submitted, shown struck-through on a near miss. */
  userInput: string;
  /** Advance to the next question (also bound to the Enter key in the view). */
  onContinue: () => void;
}

/**
 * Post-submit feedback: a green check for an exact answer (quality 5), an
 * amber near-miss reveal (quality 3), or a red reveal with a shake for a
 * wrong answer (quality 0). Honors `prefers-reduced-motion`.
 */
export function FeedbackLayer({
  result,
  userInput,
  onContinue,
}: FeedbackLayerProps) {
  const reduce = useReducedMotion();
  const { t, i18n } = useTranslation();
  const language: Language = i18n.language === "fr" ? "fr" : "en";

  // Build the "next review …" relative phrase from the SM-2 interval.
  const reviewWhen =
    result.interval_days <= 0
      ? t("practice.reviewToday")
      : t("practice.reviewInDays", { count: result.interval_days });

  // Show the correct answer in the active language (falls back to English).
  const correct = pickLocalized(
    result.correct_answer,
    result.correct_answer_fr,
    language,
  );

  if (result.quality === 5) {
    return (
      <motion.div
        className="flex flex-col items-center gap-2 text-success"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: DURATION.base, ease: EASE_CALM }}
      >
        <Check size={48} strokeWidth={2.5} aria-hidden />
        <span className="text-sm font-medium">{t("practice.correct")}</span>
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
        {isFuzzy ? t("practice.close") : t("practice.notQuite")}
      </span>
      {userInput.trim() && (
        <span className="text-base text-text-muted line-through">
          {userInput}
        </span>
      )}
      <span className="font-display text-4xl text-text">{correct}</span>
      <span className="text-xs text-text-muted">
        {t("practice.nextReview", { when: reviewWhen })}
      </span>
      <button
        type="button"
        onClick={onContinue}
        className={`rounded-input px-2 py-1 text-sm text-text-muted underline-offset-4 hover:text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          reduce ? "" : "ease-calm transition-colors duration-150"
        }`}
      >
        {t("practice.continue")}
      </button>
    </motion.div>
  );
}
