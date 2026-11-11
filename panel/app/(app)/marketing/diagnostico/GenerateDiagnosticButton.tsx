"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateDiagnosticAction } from "./actions";

export function GenerateDiagnosticButton({ clientId, hasReport }: { clientId: string; hasReport: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await generateDiagnosticAction(clientId);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        <Sparkles className="h-4 w-4" />
        {pending ? "Analizando (≈1 min)…" : hasReport ? "Generar de nuevo" : "Generar reporte IA"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
