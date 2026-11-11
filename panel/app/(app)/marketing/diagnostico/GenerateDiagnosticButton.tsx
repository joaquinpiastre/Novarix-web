"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { generateDiagnosticAction } from "./actions";

export function GenerateDiagnosticButton({ clientId, hasReport }: { clientId: string; hasReport: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[320px]">
      <Input
        label="Indicaciones para la IA (opcional)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ej: enfocate en por qué bajó el alcance este mes"
        maxLength={2000}
      />
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await generateDiagnosticAction(clientId, prompt);
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
