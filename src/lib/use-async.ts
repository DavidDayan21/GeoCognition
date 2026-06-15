/**
 * Tiny data-loading hook for read-only backend queries. Re-runs the loader
 * whenever `key` changes and ignores results from stale runs. The latest
 * loader is read through a ref, so `key` is the only dependency.
 */
import { useEffect, useRef, useState } from "react";

export type AsyncStatus = "loading" | "ready" | "error";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
}

export function useAsync<T>(
  loader: () => Promise<T>,
  key: unknown,
): AsyncState<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [state, setState] = useState<AsyncState<T>>({
    status: "loading",
    data: null,
  });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null });
    loaderRef
      .current()
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null });
      });
    return () => {
      active = false;
    };
  }, [key]);

  return state;
}
