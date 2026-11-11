"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { META_CONNECT_MESSAGES } from "@/lib/meta/oauthState";
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

function FacebookButton({ clientId, label }: { clientId: string; label: string }) {
  return (
    <a
      href={`/api/meta/oauth/start?from=panel&client=${clientId}`}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
        <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
      </svg>
      {label}
    </a>
  );
}

function ConnectStatusBanner() {
  const params = useSearchParams();
  const status = params.get("meta");
  const msg = status ? META_CONNECT_MESSAGES[status] : null;
  if (!msg) return null;
  const tone = msg.tone === "success" ? "border-success/40 text-success" : msg.tone === "danger" ? "border-danger/40 text-danger" : "border-warning/40 text-warning";
  return <Card className={`text-sm ${tone}`}>{msg.text}</Card>;
}

function ConnectForm({ clientId, oauthEnabled }: { clientId: string; oauthEnabled: boolean }) {
  const [state, formAction] = useFormState<ActionState, FormData>(connectMeta, {});
  const [showManual, setShowManual] = useState(!oauthEnabled);

  return (
    <Card>
      <CardTitle>Conectar Meta</CardTitle>
      {oauthEnabled ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Iniciá sesión con la cuenta de Facebook que administra la página, el Instagram y la cuenta publicitaria del cliente, y elegí qué compartir.
            Todo lo que se comparta se agrega solo y se sincroniza. El cliente también puede hacerlo desde su portal (Métricas).
          </p>
          <FacebookButton clientId={clientId} label="Conectar con Facebook" />
          <button type="button" onClick={() => setShowManual((v) => !v)} className="self-start text-xs text-text-muted underline">
            {showManual ? "Ocultar" : "O pegar un token manualmente"}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-text-muted">
          Pegá un access token de larga duración de un System User del Business Manager de Novarix
          (Configuración del negocio → Usuarios del sistema → Generar token, con acceso a los activos
          de este cliente). El botón &quot;Conectar con Facebook&quot; se habilita cuando se cargan META_APP_ID y META_APP_SECRET.
        </p>
      )}
      {showManual && (
        <form action={formAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="client_id" value={clientId} />
          <Textarea name="access_token" rows={2} placeholder="EAAG..." required />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitButton label="Conectar" pendingLabel="Validando…" />
        </form>
      )}
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
  oauthEnabled,
}: {
  clientId: string;
  connection: MetaConnection;
  assets: MetaAsset[];
  oauthEnabled: boolean;
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
        {oauthEnabled && (
          <a
            href={`/api/meta/oauth/start?from=panel&client=${clientId}`}
            className="inline-flex min-h-10 items-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover"
          >
            Reconectar con Facebook
          </a>
        )}
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
  metaOAuthEnabled,
}: {
  metaOAuthEnabled: boolean;
  clientId: string;
  connections: MetaConnection[];
  assets: MetaAsset[];
  dailySpend: DailySpendPoint[];
  alerts: Alert[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <ConnectStatusBanner />
      <AlertsCard clientId={clientId} alerts={alerts} />
      {connections.length === 0 ? (
        <ConnectForm clientId={clientId} oauthEnabled={metaOAuthEnabled} />
      ) : (
        connections.map((c) => (
          <ConnectionCard
            key={c.id}
            oauthEnabled={metaOAuthEnabled}
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
