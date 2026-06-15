/**
 * Resolves CSS custom properties to concrete color strings. Recharts renders
 * colors as SVG presentation attributes, where `var(--x)` does not resolve, so
 * chart components read concrete values through this hook.
 *
 * Values re-resolve whenever the document root's class changes (which is how
 * the theme is applied), so charts recolor live on a theme toggle. Pass a
 * module-level constant array for `names` so its identity is stable.
 */
import { useEffect, useState } from "react";

function resolveVars<K extends string>(names: readonly K[]): Record<K, string> {
  const result = {} as Record<K, string>;
  if (typeof document === "undefined") return result;
  const styles = getComputedStyle(document.documentElement);
  for (const name of names) {
    result[name] = styles.getPropertyValue(name).trim();
  }
  return result;
}

export function useCssVars<K extends string>(
  names: readonly K[],
): Record<K, string> {
  const [vars, setVars] = useState<Record<K, string>>(() => resolveVars(names));

  useEffect(() => {
    setVars(resolveVars(names));
    if (
      typeof MutationObserver === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }
    const observer = new MutationObserver(() => setVars(resolveVars(names)));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [names]);

  return vars;
}
