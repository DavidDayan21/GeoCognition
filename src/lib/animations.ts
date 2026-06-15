/**
 * Shared Framer Motion timing and variants, mirroring the design system's
 * motion tokens (section 10 of the brief). Components combine these with
 * `useReducedMotion` to honor `prefers-reduced-motion`.
 */
import type { Transition, Variants } from "framer-motion";

/** Calm cubic-bezier easing used for every transition. */
export const EASE_CALM: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Standard durations, in seconds. */
export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  slowest: 0.6,
} as const;

/** A calm transition at the given duration (defaults to {@link DURATION.base}). */
export function calm(duration: number = DURATION.base): Transition {
  return { duration, ease: EASE_CALM };
}

/** Page-level fade + slight vertical lift. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/** Horizontal swap used between consecutive question cards. */
export const cardSwap: Variants = {
  initial: { opacity: 0, x: 48 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -48 },
};

/** Reduced-motion swap: fade only, no translation. */
export const cardSwapReduced: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
