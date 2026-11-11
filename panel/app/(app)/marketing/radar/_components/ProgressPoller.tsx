"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getSearchStatus, resumeSearch } from "../actions";

export function ProgressPoller({ searchId, initialProgress, initialMessage }: { searchId: string; initialProgress: number; initialMessage: string | null }) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [message, setMessage] = useState(initialMessage);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let active = true;
    const tick = async () => {
      const s = await getSearchStatus(searchId);
      if (!active || !s) return;
      setProgress(s.progress);
      setMessage(s.message);
      setStale(s.stale);
      if (s.status === "done" || s.status === "error") {
        router.refresh();
        return;
      }
      timer = setTimeout(tick, 2500);
    };
    let timer = setTimeout(tick, 1000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchId, router]);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-primary">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        {message ?? "Trabajando…"}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(3, progress)}%` }} />
      </div>
      {stale ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-xs text-warning">
            Parece que la búsqueda se cortó (por ejemplo, por un reinicio del servidor). Se reanuda sola en unos minutos, o podés reanudarla ahora:
            lo que ya se analizó no se repite.
          </p>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await resumeSearch(searchId);
                if (res.error !== undefined) setError(res.error);
                else {
                  setStale(false);
                  setMessage("Reanudando…");
                }
              })
            }
          >
            <RotateCcw className="h-4 w-4" /> Reanudar
          </Button>
        </div>
      ) : (
        <p className="text-xs text-text-muted">Puede tardar de 1 a 3 minutos. Podés salir de esta pantalla: la búsqueda sigue sola.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  );
}
