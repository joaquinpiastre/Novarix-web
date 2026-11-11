"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { deleteAlert, updateAlert } from "../actions";

interface AlertData {
  id: string;
  name: string;
  prompt: string;
  every_days: number;
  min_score: number;
  active: boolean;
  last_run_at: string | null;
  client_name: string | null;
  owner: string;
  last_search_id: string | null;
}

export function AlertRow({ alert }: { alert: AlertData }) {
  const router = useRouter();
  const [name, setName] = useState(alert.name);
  const [every, setEvery] = useState(String(alert.every_days));
  const [minScore, setMinScore] = useState(String(alert.min_score));
  const [active, setActive] = useState(alert.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (nextActive = active) =>
    start(async () => {
      setError(null);
      const res = await updateAlert(alert.id, { name, every_days: Number(every), min_score: Number(minScore || 0), active: nextActive });
      if (res.error !== undefined) setError(res.error);
      else router.refresh();
    });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={active ? "success" : "neutral"}>{active ? "Activa" : "Pausada"}</Badge>
        {alert.client_name && <Badge tone="accent">{alert.client_name}</Badge>}
        <span className="text-xs text-text-muted">
          {alert.owner} · última corrida: {alert.last_run_at ? new Date(alert.last_run_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "nunca"}
        </span>
        {alert.last_search_id && (
          <Link href={`/marketing/radar/${alert.last_search_id}`} className="text-xs text-accent underline">Ver últimos resultados</Link>
        )}
      </div>
      <p className="text-sm text-text-muted">{alert.prompt}</p>
      <div className="grid gap-3 sm:grid-cols-5 sm:items-end">
        <div className="sm:col-span-2">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Select label="Cada" value={every} onChange={(e) => setEvery(e.target.value)}>
          {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} día{d === 1 ? "" : "s"}</option>)}
        </Select>
        <Input label="Score mínimo" inputMode="numeric" value={minScore} onChange={(e) => setMinScore(e.target.value.replace(/\D/g, ""))} />
        <div className="flex gap-2">
          <Button variant="secondary" disabled={pending} onClick={() => save()}>Guardar</Button>
          <Button variant="ghost" disabled={pending} onClick={() => { setActive(!active); save(!active); }}>
            {active ? "Pausar" : "Activar"}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            title="Borrar alerta"
            onClick={() => {
              if (!confirm("¿Borrar esta alerta?")) return;
              start(async () => { await deleteAlert(alert.id); router.refresh(); });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
