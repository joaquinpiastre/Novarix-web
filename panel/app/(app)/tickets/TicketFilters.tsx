"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from "@/lib/types/domain";

export function TicketFilters({
  clients,
  current,
}: {
  clients: { id: string; name: string }[];
  current: { client?: string; status?: string; type?: string; priority?: string; overdue?: string };
}) {
  const router = useRouter();

  function update(key: string, value: string) {
    const params = new URLSearchParams(current as Record<string, string>);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/tickets?${params.toString()}`);
  }

  const hasFilters = Boolean(current.client || current.status || current.type || current.priority || current.overdue);

  return (
    <div className="flex flex-wrap gap-2">
      <Select label="Estado" value={current.status} options={TICKET_STATUS_LABELS} onChange={(v) => update("status", v)} />
      <Select label="Tipo" value={current.type} options={TICKET_TYPE_LABELS} onChange={(v) => update("type", v)} />
      <Select label="Prioridad" value={current.priority} options={TICKET_PRIORITY_LABELS} onChange={(v) => update("priority", v)} />
      <Select
        label="Cliente"
        value={current.client}
        options={Object.fromEntries(clients.map((c) => [c.id, c.name]))}
        onChange={(v) => update("client", v)}
      />
      <Link
        href="/tickets?overdue=true"
        className={clsx(
          "rounded-lg border px-3 py-1.5 text-xs font-medium",
          current.overdue === "true"
            ? "border-danger bg-danger/10 text-danger"
            : "border-border text-text-muted hover:text-text-primary"
        )}
      >
        Vencidos por SLA
      </Link>
      {hasFilters && (
        <Link href="/tickets" className="rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-primary">
          Limpiar filtros
        </Link>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      defaultValue={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-primary"
    >
      <option value="">{label}: todos</option>
      {Object.entries(options).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
