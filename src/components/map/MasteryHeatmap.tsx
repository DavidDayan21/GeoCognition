import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { getMasteryMap } from "../../api/tauri-api";
import { useAsync } from "../../lib/use-async";
import { Segmented } from "../ui/Segmented";
import type { SegmentedOption } from "../ui/Segmented";
import type { QuestionMode } from "../../types/domain";
import { buildMasteryByIso, masteryFill, WORLD_GEO_URL } from "./map-utils";
import type { MapGeography } from "./map-utils";

const LEGEND = [
  { key: "heatmap.unseen", color: "var(--surface-2)" },
  { key: "heatmap.struggling", color: "var(--mastery-0)" },
  { key: "heatmap.learning", color: "var(--mastery-1)" },
  { key: "heatmap.familiar", color: "var(--mastery-2)" },
  { key: "heatmap.mastered", color: "var(--mastery-3)" },
] as const;

/**
 * World map colored by easiness factor per country, for the selected mode.
 * Microstates absent from the 110m geometry simply aren't drawn; their
 * mastery still appears in the other charts.
 */
export function MasteryHeatmap() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<QuestionMode>("capital");
  const { data } = useAsync(() => getMasteryMap(mode), mode);

  const modeOptions: ReadonlyArray<SegmentedOption<QuestionMode>> = [
    { value: "capital", label: t("common.capitals") },
    { value: "flag", label: t("common.flags") },
  ];

  const byIso = useMemo(() => buildMasteryByIso(data ?? []), [data]);

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        ariaLabel={t("heatmap.mode")}
        options={modeOptions}
        value={mode}
        onChange={setMode}
      />

      <div className="w-full overflow-hidden rounded-card border border-border bg-surface">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 150 }}
          width={800}
          height={380}
          style={{ width: "100%", height: "auto" }}
          aria-label={t("heatmap.ariaMap")}
        >
          <Geographies geography={WORLD_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo: MapGeography) => {
                const iso = geo.properties.iso_a3;
                const ef = iso ? (byIso.get(iso) ?? null) : null;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    tabIndex={-1}
                    style={{
                      default: {
                        fill: masteryFill(ef),
                        stroke: "var(--bg)",
                        strokeWidth: 0.5,
                        outline: "none",
                        transition: "fill 250ms cubic-bezier(0.22, 1, 0.36, 1)",
                      },
                      hover: {
                        fill: masteryFill(ef),
                        stroke: "var(--bg)",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      pressed: {
                        fill: masteryFill(ef),
                        stroke: "var(--bg)",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {LEGEND.map((item) => (
          <li
            key={item.key}
            className="flex items-center gap-1.5 text-xs text-text-muted"
          >
            <span
              aria-hidden
              className="h-3 w-3 rounded-sm border border-border"
              style={{ backgroundColor: item.color }}
            />
            {t(item.key)}
          </li>
        ))}
      </ul>
    </div>
  );
}
