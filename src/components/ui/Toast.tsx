import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { DURATION, EASE_CALM } from "../../lib/animations";
import { useToastStore } from "../../store/toast-store";
import type { Toast as ToastModel } from "../../store/toast-store";

/** Auto-dismiss delay for a toast, in milliseconds. */
const TOAST_TTL_MS = 4000;

const VARIANT_CLASS: Record<ToastModel["variant"], string> = {
  info: "border-border",
  success: "border-success",
  error: "border-error",
};

function ToastItem({ toast }: { toast: ToastModel }) {
  const dismiss = useToastStore((state) => state.dismiss);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), TOAST_TTL_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: DURATION.base, ease: EASE_CALM }}
      className={`pointer-events-auto rounded-card border bg-surface px-4 py-3 text-sm text-text shadow-md ${VARIANT_CLASS[toast.variant]}`}
      role="status"
    >
      {toast.message}
    </motion.div>
  );
}

/** Fixed bottom-right stack of active toasts. Mount once at the app root. */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-72 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
