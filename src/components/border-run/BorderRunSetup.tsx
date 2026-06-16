import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { useSettingsStore } from "../../store/settings-store";
import type { Difficulty } from "../../types/domain";

/**
 * Border Run home-screen setup: a description, a 3-position difficulty slider
 * (persisted to settings), and a CTA that opens the game route.
 */
export function BorderRunSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const difficulty = useSettingsStore(
    (s) => s.settings?.border_run_difficulty ?? "medium",
  );
  const setDifficulty = useSettingsStore((s) => s.setBorderRunDifficulty);

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <h2 className="font-display text-2xl text-text">
          {t("borderRun.title")}
        </h2>
        <p className="text-text-muted">{t("borderRun.subtitle")}</p>
      </div>

      <Slider<Difficulty>
        className="w-full max-w-sm"
        ariaLabel={t("borderRun.difficulty.label")}
        label={t("borderRun.difficulty.label")}
        value={difficulty}
        onChange={setDifficulty}
        options={[
          { value: "easy", label: t("borderRun.difficulty.easy") },
          { value: "medium", label: t("borderRun.difficulty.medium") },
          { value: "hard", label: t("borderRun.difficulty.hard") },
        ]}
      />

      <Button
        onClick={() => navigate("/border-run")}
        className="px-12 py-4 text-base font-semibold"
      >
        <Play size={20} aria-hidden />
        {t("borderRun.start")}
      </Button>
    </div>
  );
}
