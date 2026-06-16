import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { EASE_CALM } from "../../lib/animations";

export interface SliderOption<T extends string> {
  value: T;
  label: string;
}

interface SliderProps<T extends string> {
  options: SliderOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Visible label rendered above the track. */
  label?: string;
  /** Accessible name for the slider. */
  ariaLabel: string;
  className?: string;
}

/**
 * A discrete, multi-position slider that snaps its thumb to one of the given
 * options. Fully keyboard-accessible (arrow keys, Home/End) and draggable via
 * pointer, honoring `prefers-reduced-motion` for the snap animation.
 */
export function Slider<T extends string>({
  options,
  value,
  onChange,
  label,
  ariaLabel,
  className = "",
}: SliderProps<T>) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const trackRef = useRef<HTMLDivElement>(null);

  const lastIndex = options.length - 1;
  const currentIndex = options.findIndex((o) => o.value === value);
  const index = currentIndex === -1 ? 0 : currentIndex;
  const fractionOf = (i: number): number =>
    lastIndex === 0 ? 0 : i / lastIndex;
  const fraction = fractionOf(index);

  const commitIndex = (next: number): void => {
    const clamped = Math.min(lastIndex, Math.max(0, next));
    const option = options[clamped];
    if (option && option.value !== value) onChange(option.value);
  };

  const indexFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return index;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return index;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.round(ratio * lastIndex);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        commitIndex(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        commitIndex(index - 1);
        break;
      case "Home":
        event.preventDefault();
        commitIndex(0);
        break;
      case "End":
        event.preventDefault();
        commitIndex(lastIndex);
        break;
      default:
        break;
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    commitIndex(indexFromClientX(event.clientX));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      commitIndex(indexFromClientX(event.clientX));
    }
  };

  const snap = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: EASE_CALM };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {label && <span className="text-sm font-medium text-text">{label}</span>}

      <div
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={index}
        aria-valuetext={options[index]?.label}
        onKeyDown={handleKeyDown}
        className="relative cursor-pointer select-none rounded-card py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          className="relative h-2 rounded-full bg-surface-2"
        >
          {/* Filled portion up to the active position */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            animate={{ width: `${fraction * 100}%` }}
            transition={snap}
          />
          {/* Tick dots, one per position */}
          {options.map((option, i) => (
            <span
              key={option.value}
              aria-hidden
              className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                i <= index ? "bg-accent" : "bg-border"
              }`}
              style={{ left: `${fractionOf(i) * 100}%` }}
            />
          ))}
          {/* Thumb */}
          <motion.div
            aria-hidden
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-bg shadow-sm"
            animate={{ left: `${fraction * 100}%` }}
            transition={snap}
          />
        </div>
      </div>

      {/* Position labels, aligned under their ticks */}
      <div className="relative h-5">
        {options.map((option, i) => {
          const transform =
            i === 0
              ? "translateX(0)"
              : i === lastIndex
                ? "translateX(-100%)"
                : "translateX(-50%)";
          return (
            <button
              key={option.value}
              type="button"
              tabIndex={-1}
              onClick={() => commitIndex(i)}
              style={{ left: `${fractionOf(i) * 100}%`, transform }}
              className={`absolute top-0 text-xs ease-calm transition-colors duration-150 ${
                i === index
                  ? "font-semibold text-text"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
