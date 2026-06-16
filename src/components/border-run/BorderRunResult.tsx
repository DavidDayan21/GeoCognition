import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import type { BorderRunGameDto } from "../../types/domain";

export interface BorderRunResultProps {
  open: boolean;
  game: BorderRunGameDto;
  /** Whether the winning route used only shortest-path countries. */
  optimal: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
}

/**
 * End-of-game overlay. On a win it reports how many attempts were spent and
 * whether the route was optimal; on a loss it points to the shortest path now
 * revealed on the map. Both offer "Play again" (same difficulty) and "Change
 * difficulty" (back to setup). Dismissing it leaves the final map on view.
 */
export function BorderRunResult({
  open,
  game,
  optimal,
  onClose,
  onPlayAgain,
  onChangeDifficulty,
}: BorderRunResultProps) {
  const { t } = useTranslation();
  const won = game.status === "won";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(won ? "borderRun.win.title" : "borderRun.lose.title")}
    >
      <div className="mb-6 flex flex-col gap-2 text-sm text-text-muted">
        <p>
          {t("borderRun.win.attempts", {
            used: game.attempts_used,
            limit: game.attempts_limit,
          })}
        </p>
        <p>
          {won
            ? t(optimal ? "borderRun.win.optimal" : "borderRun.win.withDetour")
            : t("borderRun.lose.reveal")}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onChangeDifficulty}>
          {t("borderRun.changeDifficulty")}
        </Button>
        <Button onClick={onPlayAgain}>{t("borderRun.playAgain")}</Button>
      </div>
    </Modal>
  );
}
