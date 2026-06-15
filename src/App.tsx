import { MotionConfig } from "framer-motion";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ToastViewport } from "./components/ui/Toast";
import { applyTheme, darkModeMediaQuery } from "./lib/theme";
import { useSettingsStore } from "./store/settings-store";

/**
 * Root layout. Loads settings once, applies the chosen theme to the document
 * root, and tracks OS theme changes while in `system` mode. `MotionConfig`
 * makes every Framer animation respect `prefers-reduced-motion`.
 */
export default function App() {
  const load = useSettingsStore((s) => s.load);
  const theme = useSettingsStore((s) => s.settings?.theme ?? "system");

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = darkModeMediaQuery();
    if (!media) return;
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-bg text-text">
        <Outlet />
        <ToastViewport />
      </div>
    </MotionConfig>
  );
}
