import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

/** Single-line text input styled per the design system. */
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full rounded-input border border-border bg-surface px-4 py-3 text-text ease-calm transition-colors duration-150 placeholder:text-text-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60 ${className}`}
    {...props}
  />
));
Input.displayName = "Input";
