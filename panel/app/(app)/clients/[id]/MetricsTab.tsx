"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, formatDateTime } from "@/lib/utils/dates";
import {
  META_ASSET_TYPE_LABELS,
  type Alert,
  type AlertSeverity,
  type MetaAsset,
  type MetaConnection,
} from "@/lib/types/domain";
import {
  addMetaAsset,
  connectMeta,
  disconnectMeta,
  listAvailableMetaAssets,
  removeMetaAsset,
  resolveAlert,
  syncMetaNow,
  type ActionState,
  type ListAssetsState,
  type SyncNowState,
} from "./metaActions";
import type { DailySpendPoint } from "./page";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? pendingLabel : label}
    </Button>
  );
}

const ALERT_TONE: Record<AlertSeverity, "warning" | "danger" | "neutral"> = {
  info: "neutral",
  warning: "warning",
  critical: "danger",
};

function ConnectForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(connectMeta, {});

  return (
    <Card>
      <CardTitle>Conectar Meta</CardTitle>
      <p className="mt-2 text-sm text-text-muted">
        Pegá un access token de larga duración de un System User del Business Manager de Novarix
        (Configuración del negocio → Usuarios del sistema → Generar token, con acceso a los activos
        de este cliente).
      </p>
      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <Textarea name="access_token" rows={2} placeholder="EAAG..." required />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton label="Conectar" pendingLabel="Validando…" />
      </form>
    </Card>
  );
}

function AssetPicker({ clientId, connectionId }: { clientId: string; connectionId: string }) {
  const [state, formAction] = useFormState<ListAssetsState, FormData>(listAvailableMetaAssets, {});

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-hover p-4">
      <form action={formAction}>
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="connection_id" value={connectionId} />
        <SubmitButton label="Buscar cuentas disponibles" pendingLabel="Buscando…" />
      </form>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state.assets && (
        <ul className="mt-3 divide-y divide-border">
          {state.assets.map((a) => (
            <li key={`${a.type}-${a.external_id}`} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm text-text-primary">{a.name}</p>
                <p className="text-xs text-text-muted">{META_ASSET_TYPE_LABELS[a.type]}</p>
              </div>
              <form
                action={(fd) => {
                  fd.set("client_id", clientId);
                  fd.set("connection_id", connectionId);
                  fd.set("asset_type", a.type);
                  fd.set("external_id", a.external_id);
                  fd.set("name", a.name);
                  addMetaAsset(fd);
                }}
              >
                <Button type="submit" variant="secondary">
                  Agregar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConnectionCard({
  clientId,
  connection,
  assets,
}: {
  clientId: string;
  connection: MetaConnection;
  assets: MetaAsset[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [syncState, syncAction] = useFormState<SyncNowState, FormData>(syncMetaNow, {});

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Conexión con Meta</CardTitle>
        <Badge tone={connection.status === "active" ? "success" : connection.status === "error" ? "danger" : "neutral"}>
          {connection.status === "active" ? "Activa" : connection.status === "error" ? "Error" : "Vencida"}
        </Badge>
      </div>
      {connection.last_synced_at && (
        <p className="mt-1 text-xs text-text-muted">
          Última sync: {formatDateTime(connection.last_synced_at)}
        </p>
      )}
      {connection.last_error && <p className="mt-1 text-xs text-danger">{connection.last_error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={syncAction}>
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="connection_id" value={connection.id} />
          <SubmitButton label="Sincronizar ahora" pendingLabel="Sincronizando…" />
        </form>
        <Button variant="secondary" onClick={() => setShowPicker((v) => !v)}>
          {showPicker ? "Cerrar" : "Agregar activo"}
        </Button>
        <form action={disconnectMeta}>
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="connection_id" value={connection.id} />
          <Button type="submit" variant="ghost">
            Desconectar
          </Button>
        </form>
      </div>
      {syncState.error && <p className="mt-2 text-sm text-danger">{syncState.error}</p>}
      {syncState.ok && <p className="mt-2 text-sm text-success">Sincronizado.</p>}

      {showPicker && <AssetPicker clientId={clientId} connectionId={connection.id} />}

      <ul className="mt-4 divide-y divide-border">
        {assets.length === 0 && <p className="text-sm text-text-muted">Sin activos agregados.</p>}
        {assets.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="text-sm text-text-primary">{a.name ?? a.external_id}</p>
              <p className="text-xs text-text-muted">{META_ASSET_TYPE_LABELS[a.asset_type]}</p>
            </div>
            <form
              action={(fd) => {
                fd.set("client_id", clientId);
                fd.set("id", a.id);
                removeMetaAsset(fd);
              }}
            >
              <Button type="submit" variant="ghost">
                Quitar
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SpendChart({ data }: { data: DailySpendPoint[] }) {
  const totalSpend = data.reduce((s, d) => s + d.spend, 0);
  const totalResults = data.reduce((s, d) => s + d.results, 0);
  const totalImpressions = data.reduce((s, d) => s + d.impressions, 0);

  return (
    <Card>
      <CardTitle>Inversión en pauta (30 días)</CardTitle>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold text-text-primary">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-text-muted">Invertido</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-text-primary">{totalResults}</p>
          <p className="text-xs text-text-muted">Resultados</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-text-primary">{totalImpressions.toLocaleString("es-AR")}</p>
          <p className="text-xs text-text-muted">Impresiones</p>
        </div>
      </div>
      {data.length > 0 ? (
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatDate(v).slice(0, 5)}
                stroke="var(--chart-axis)"
                tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                stroke="var(--chart-axis)"
                tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                labelFormatter={(v) => formatDate(v)}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              />
              <Bar dataKey="spend" fill="var(--chart-series)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">Todavía no hay datos sincronizados.</p>
      )}
    </Card>
  );
}

function AlertsCard({ clientId, alerts }: { clientId: string; alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <Card>
      <CardTitle>Alertas</CardTitle>
      <ul className="mt-3 divide-y divide-border">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2">
              <Badge tone={ALERT_TONE[a.severity]}>{a.severity}</Badge>
              <p className="text-sm text-text-primary">{a.message}</p>
            </div>
            <form
              action={(fd) => {
                fd.set("client_id", clientId);
                fd.set("id", a.id);
                resolveAlert(fd);
              }}
            >
              <Button type="submit" variant="ghost">
                Resolver
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function MetricsTab({
  clientId,
  connections,
  assets,
  dailySpend,
  alerts,
}: {
  clientId: string;
  connections: MetaConnection[];
  assets: MetaAsset[];
  dailySpend: DailySpendPoint[];
  alerts: Alert[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <AlertsCard clientId={clientId} alerts={alerts} />
      {connections.length === 0 ? (
        <ConnectForm clientId={clientId} />
      ) : (
        connections.map((c) => (
          <ConnectionCard
            key={c.id}
            clientId={clientId}
            connection={c}
            assets={assets.filter((a) => a.connection_id === c.id)}
          />
        ))
      )}
      <SpendChart data={dailySpend} />
    </div>
  );
}
