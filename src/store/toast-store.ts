/**
 * Minimal transient-notification store. The visual stack is rendered by
 * `components/ui/Toast.tsx`; callers push messages via `show`.
 */
import { create } from "zustand";

export type ToastVariant = "info" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  /** Adds a toast and returns its id. */
  show: (message: string, variant?: ToastVariant) => number;
  /** Removes a toast by id (no-op if already gone). */
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, variant = "info") => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
