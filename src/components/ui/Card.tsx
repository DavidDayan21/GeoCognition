import type { HTMLAttributes } from "react";

/** Surface container with the standard 1px border and 12px radius. */
export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-border bg-surface ${className}`}
      {...props}
    />
  );
}
