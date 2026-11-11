"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui/Select";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/trends/types";
import type { VideoCardData } from "@/lib/trends/view";
import { VideoCard } from "./VideoCard";

type SortKey = "score" | "views" | "velocity" | "outlier" | "date";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Score" },
  { value: "views", label: "Vistas" },
  { value: "velocity", label: "Velocidad" },
  { value: "outlier", label: "Outlier" },
  { value: "date", label: "Más recientes" },
];

function sortValue(v: VideoCardData, key: SortKey): number {
  switch (key) {
    case "score":
      return v.scores?.final ?? -1;
    case "views":
      return v.views ?? -1;
    case "velocity":
      return v.scores?.velocity ?? -1;
    case "outlier":
      return v.scores?.outlierRatio ?? -1;
    case "date":
      return v.publishedAt ? Date.parse(v.publishedAt) : -1;
  }
}

export function ResultsView({
  cards,
  clientId,
  clients,
  searchId,
  showSort = true,
}: {
  cards: VideoCardData[];
  clientId: string | null;
  clients: { id: string; name: string }[];
  searchId?: string;
  showSort?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("score");
  const [platform, setPlatform] = useState<string>("");
  const [onlyAnalyzed, setOnlyAnalyzed] = useState(false);
  const [showDiscarded, setShowDiscarded] = useState(false);

  const visible = useMemo(() => {
    return cards
      .filter((c) => !platform || c.platform === platform)
      .filter((c) => !onlyAnalyzed || c.analysis)
      .filter((c) => showDiscarded || !c.scores?.discarded)
      .sort((a, b) => sortValue(b, sort) - sortValue(a, sort));
  }, [cards, sort, platform, onlyAnalyzed, showDiscarded]);

  const discardedCount = cards.filter((c) => c.scores?.discarded).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        {showSort && (
          <Select label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        )}
        <Select label="Plataforma" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">Todas</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
        </Select>
        <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm text-text-primary sm:col-span-1">
          <input type="checkbox" checked={onlyAnalyzed} onChange={(e) => setOnlyAnalyzed(e.target.checked)} />
          Solo analizados
        </label>
        {discardedCount > 0 && (
          <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm text-text-primary sm:col-span-1">
            <input type="checkbox" checked={showDiscarded} onChange={(e) => setShowDiscarded(e.target.checked)} />
            Ver descartados ({discardedCount})
          </label>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">No hay videos con estos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((v) => (
            <VideoCard key={v.videoId} v={v} clientId={clientId} clients={clients} searchId={searchId} />
          ))}
        </div>
      )}
    </div>
  );
}
