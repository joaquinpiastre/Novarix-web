"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getSearchStatus } from "../actions";

export function ProgressPoller({ searchId, initialProgress, initialMessage }: { searchId: string; initialProgress: number; initialMessage: string | null }) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      const s = await getSearchStatus(searchId);
      if (!active || !s) return;
      setProgress(s.progress);
      setMessage(s.message);
      if (s.status === "done" || s.status === "error") {
        router.refresh();
        return;
      }
      timer = setTimeout(tick, 2500);
    };
    let timer = setTimeout(tick, 2000);
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
      <p className="text-xs text-text-muted">Puede tardar de 1 a 3 minutos. Podés salir de esta pantalla: la búsqueda sigue sola.</p>
    </Card>
  );
}
