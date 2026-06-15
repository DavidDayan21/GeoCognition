import type { ReactNode } from "react";

/** Fixed-height centered message for chart loading / empty / error states. */
export function StatPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-[240px] items-center justify-center px-6 text-center text-sm text-text-muted"
      role="status"
    >
      {children}
    </div>
  );
}
