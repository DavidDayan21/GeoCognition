import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_CALM } from "../../lib/animations";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the radio group. */
  ariaLabel: string;
  className?: string;
}

/**
 * A radio-group styled as a pill-shaped segmented control. The active segment
 * is highlighted by an accent pill that slides between options (respecting
 * `prefers-reduced-motion`).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: SegmentedControlProps<T>) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex gap-1 rounded-card bg-surface-2 p-1 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className="relative inline-flex items-center justify-center gap-2 rounded-card px-6 py-2.5 font-medium ease-calm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {active && (
              <motion.span
                layoutId="segmented-active"
                aria-hidden
                className="absolute inset-0 rounded-card bg-accent"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.25, ease: EASE_CALM }
                }
              />
            )}
            <span
              className={`relative z-10 inline-flex items-center gap-2 ${
                active ? "text-bg" : "text-text-muted"
              }`}
            >
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
