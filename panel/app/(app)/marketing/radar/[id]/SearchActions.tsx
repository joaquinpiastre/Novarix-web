"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { deleteSearch, saveSearchAsAlert } from "../actions";

export function SearchActions({ searchId, prompt }: { searchId: string; prompt: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(prompt.slice(0, 60));
  const [every, setEvery] = useState("7");
  const [minScore, setMinScore] = useState("60");
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
          <BellPlus className="h-4 w-4" /> Guardar como alerta
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Borrar esta búsqueda? Los tableros y las ideas creadas no se tocan.")) return;
            start(async () => {
              const res = await deleteSearch(searchId);
              if (res.error === undefined) router.push("/marketing/radar");
            });
          }}
        >
          <Trash2 className="h-4 w-4" /> Borrar
        </Button>
      </div>
      {open && (
        <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className="sm:col-span-2">
            <Input label="Nombre de la alerta" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Select label="Repetir cada" value={every} onChange={(e) => setEvery(e.target.value)}>
            <option value="1">1 día</option>
            <option value="3">3 días</option>
            <option value="7">7 días</option>
            <option value="14">14 días</option>
            <option value="30">30 días</option>
          </Select>
          <Input label="Avisar si score ≥" inputMode="numeric" value={minScore} onChange={(e) => setMinScore(e.target.value.replace(/\D/g, ""))} />
          <div className="sm:col-span-4">
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await saveSearchAsAlert(searchId, { name, every_days: Number(every), min_score: Number(minScore || 0) });
                  setMsg(res.error !== undefined ? { error: res.error } : { ok: true });
                  if (res.error === undefined) router.refresh();
                })
              }
            >
              Crear alerta
            </Button>
            <p className="mt-2 text-xs text-text-muted">Te avisamos (notificación y email) solo cuando aparezcan videos nuevos que superen el score.</p>
          </div>
          {msg?.error && <p className="text-sm text-danger sm:col-span-4">{msg.error}</p>}
          {msg?.ok && <p className="text-sm text-success sm:col-span-4">Alerta creada.</p>}
        </div>
      )}
    </Card>
  );
}
