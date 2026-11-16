"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { MetaAssetType } from "@/lib/types/domain";

// Eleccion de las cuentas de Meta (pagina, Instagram, cuenta publicitaria)
// que son de un cliente, agrupadas por portfolio comercial. Lo usan la ficha
// del cliente (equipo) y el portal (titular) con sus propias server actions.

export interface AssetChoice {
  type: MetaAssetType;
  external_id: string;
  name: string;
  business_id?: string | null;
  business_name?: string | null;
  selected: boolean;
  used_by: string | null;
}

const TYPE_LABEL: Record<MetaAssetType, string> = {
  page: "Página de Facebook",
  instagram: "Instagram",
  ad_account: "Cuenta publicitaria",
};
const TYPE_ORDER: Record<MetaAssetType, number> = { page: 0, instagram: 1, ad_account: 2 };

// Tildes y dieresis (U+0300 a U+036F) que quedan sueltas despues de NFD.
const DIACRITICS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Sugerencia: cuentas cuyo nombre (o el de su portfolio) se parece al del cliente. */
function suggests(choice: AssetChoice, clientName: string): boolean {
  const words = norm(clientName).split(" ").filter((w) => w.length >= 4);
  if (words.length === 0) return false;
  const hay = norm(`${choice.name} ${choice.business_name ?? ""}`);
  return words.some((w) => hay.includes(w));
}

export function AssetChooser({
  clientName,
  load,
  save,
  onDone,
}: {
  clientName: string;
  load: () => Promise<{ choices?: AssetChoice[]; error?: string }>;
  save: (selected: { type: MetaAssetType; external_id: string }[]) => Promise<{ saved?: number; error?: string }>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<AssetChoice[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [pending, run] = useTransition();
  const key = (c: { type: string; external_id: string }) => `${c.type}:${c.external_id}`;

  useEffect(() => {
    let alive = true;
    load().then((res) => {
      if (!alive) return;
      if (res.error || !res.choices) {
        setError(res.error ?? "No se pudieron leer las cuentas.");
        return;
      }
      setChoices(res.choices);
      const already = res.choices.filter((c) => c.selected);
      // Si todavia no eligio nada, se sugieren las que coinciden con el nombre del cliente.
      const initial = already.length ? already : res.choices.filter((c) => !c.used_by && suggests(c, clientName));
      setChecked(new Set(initial.map(key)));
    });
    return () => {
      alive = false;
    };
  }, [load, clientName]);

  const groups = useMemo(() => {
    const map = new Map<string, AssetChoice[]>();
    for (const c of choices ?? []) {
      const g = c.business_name ?? "Sin portfolio (cuentas personales)";
      map.set(g, [...(map.get(g) ?? []), c]);
    }
    return Array.from(map.entries())
      .map(([name, list]) => [name, list.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name))] as const)
      .sort((a, b) => Number(b[1].some((c) => suggests(c, clientName))) - Number(a[1].some((c) => suggests(c, clientName))) || a[0].localeCompare(b[0]));
  }, [choices, clientName]);

  const toggle = (k: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!choices) return <p className="text-sm text-text-muted">Buscando las cuentas de tu Facebook…</p>;
  if (choices.length === 0) return <p className="text-sm text-text-muted">Tu Facebook no administra páginas, Instagram ni cuentas publicitarias.</p>;

  return (
    <div className="flex flex-col gap-4 text-left">
      <p className="text-sm text-text-muted">
        Tildá solo las cuentas de <strong className="text-text-primary">{clientName}</strong>. Están agrupadas por portfolio comercial. Las que no tildes no se
        usan (y si estaban, se quitan con sus métricas).
      </p>
      {groups.map(([group, list]) => (
        <div key={group} className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Building2 className="h-4 w-4 text-accent" /> {group}
            </p>
            <button
              type="button"
              className="text-xs text-accent underline"
              onClick={() =>
                setChecked((prev) => {
                  const next = new Set(prev);
                  const all = list.every((c) => next.has(key(c)));
                  for (const c of list) {
                    if (all) next.delete(key(c));
                    else next.add(key(c));
                  }
                  return next;
                })
              }
            >
              {list.every((c) => checked.has(key(c))) ? "Destildar todo" : "Tildar todo el portfolio"}
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {list.map((c) => (
              <li key={key(c)}>
                <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-hover">
                  <input type="checkbox" checked={checked.has(key(c))} onChange={() => toggle(key(c))} />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{c.name}</span>
                  <Badge>{TYPE_LABEL[c.type]}</Badge>
                  {c.used_by && <Badge tone="warning">Ya en {c.used_by}</Badge>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {saved != null && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <Check className="h-4 w-4" /> Guardado: {saved} cuenta{saved === 1 ? "" : "s"}. Las métricas se cargan en unos minutos.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            run(async () => {
              setError(null);
              const selected = (choices ?? []).filter((c) => checked.has(key(c))).map((c) => ({ type: c.type, external_id: c.external_id }));
              const res = await save(selected);
              if (res.error) setError(res.error);
              else {
                setSaved(res.saved ?? 0);
                router.refresh();
                onDone?.();
              }
            })
          }
        >
          {pending ? "Guardando…" : `Guardar (${checked.size} elegida${checked.size === 1 ? "" : "s"})`}
        </Button>
      </div>
    </div>
  );
}
