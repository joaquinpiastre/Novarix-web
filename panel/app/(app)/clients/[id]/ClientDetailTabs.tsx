"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { can } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, formatMonthLabel } from "@/lib/utils/dates";
import {
  CLIENT_PORTAL_ROLE_LABELS,
  CLIENT_STATUS_LABELS,
  ROLE_LABELS,
  type Alert,
  type BrandKit,
  type Campaign,
  type Client,
  type ClientFile,
  type ClientPortalRole,
  type ClientReport,
  type ContentItem,
  type GhlBot,
  type MarketingPlan,
  type MetaAsset,
  type MetaConnection,
  type Profile,
  type Project,
  type ProjectMilestone,
  type ServiceCatalogItem,
  type TechAsset,
} from "@/lib/types/domain";
import type { ClientAccess } from "@/lib/auth/requireClientAccess";
import type { PendingInvite, PortalCompanyUser } from "@/lib/portal/queries";
import {
  addClientService,
  addTeamMember,
  cancelInvite,
  inviteClientUser,
  removeClientService,
  removeTeamMember,
  setClientUserActive,
  startClientPreview,
  updateClient,
  type InviteClientUserState,
  type UpdateClientState,
} from "../actions";
import {
  updateDirectCosts,
  updateTeamCostAllocation,
  type ActionState as FinanceActionState,
} from "./financeActions";
import type {
  AgreementRow,
  ClientServiceRow,
  ClientTeamRow,
  ContentCommentRow,
  DailySpendPoint,
  DeliverableProgress,
  PaymentHistoryRow,
} from "./page";
import { MarketingTab } from "./MarketingTab";
import { MetricsTab } from "./MetricsTab";
import { SystemsTab } from "./SystemsTab";
import { PortalContentTab } from "./PortalContentTab";

const STATUS_TONE = {
  activo: "success",
  prospecto: "accent",
  pausado: "warning",
  baja: "danger",
} as const;

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? pendingLabel : label}
    </Button>
  );
}

function ResumenTab({ client, canEdit }: { client: Client; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState<UpdateClientState, FormData>(updateClient, {});

  if (editing && canEdit) {
    return (
      <Card className="max-w-2xl">
        <CardTitle>Editar cliente</CardTitle>
        <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={client.id} />
          <Input label="Nombre comercial" name="name" defaultValue={client.name} required />
          <Input label="Razón social" name="legal_name" defaultValue={client.legal_name ?? ""} />
          <Input label="CUIT" name="tax_id" defaultValue={client.tax_id ?? ""} />
          <Input label="Rubro" name="industry" defaultValue={client.industry ?? ""} />
          <Input label="Ciudad" name="city" defaultValue={client.city ?? ""} />
          <Select label="Estado" name="status" defaultValue={client.status}>
            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input label="Sitio web" name="website" defaultValue={client.website ?? ""} />
          <Input
            label="Contacto principal"
            name="primary_contact_name"
            defaultValue={client.primary_contact_name ?? ""}
          />
          <Input
            label="Teléfono de contacto"
            name="primary_contact_phone"
            defaultValue={client.primary_contact_phone ?? ""}
          />
          <Input
            label="Email de contacto"
            name="primary_contact_email"
            type="email"
            defaultValue={client.primary_contact_email ?? ""}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Redes (una por línea: instagram: @usuario)"
              name="social_links"
              rows={2}
              defaultValue={
                client.social_links
                  ? Object.entries(client.social_links)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")
                  : ""
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notas" name="notes" rows={2} defaultValue={client.notes ?? ""} />
          </div>
          {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <SubmitButton label="Guardar cambios" pendingLabel="Guardando…" />
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  const rows: [string, string | null][] = [
    ["Razón social", client.legal_name],
    ["CUIT", client.tax_id],
    ["Rubro", client.industry],
    ["Ciudad", client.city],
    ["Sitio web", client.website],
    ["Contacto", client.primary_contact_name],
    ["Teléfono", client.primary_contact_phone],
    ["Email", client.primary_contact_email],
  ];

  return (
    <Card className="max-w-2xl">
      <div className="flex items-center justify-between">
        <CardTitle>Datos del cliente</CardTitle>
        {canEdit && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm text-text-primary">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      {client.notes && (
        <div className="mt-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">Notas</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm text-text-primary">{client.notes}</dd>
        </div>
      )}
    </Card>
  );
}

function ServiciosTab({
  clientId,
  services,
  catalog,
}: {
  clientId: string;
  services: ClientServiceRow[];
  catalog: ServiceCatalogItem[];
}) {
  const [showForm, setShowForm] = useState(false);
  const active = services.filter((s) => s.status === "active");
  const ended = services.filter((s) => s.status !== "active");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <CardTitle>Servicios contratados</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Agregar servicio"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form action={addClientService} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="client_id" value={clientId} />
            <Select label="Servicio" name="service_id" required defaultValue="">
              <option value="" disabled>
                Elegí un servicio
              </option>
              {catalog.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.category} · {s.name}
                </option>
              ))}
            </Select>
            <Input label="Fee mensual (opcional)" name="fee" type="number" min={0} step="0.01" />
            <Input label="Notas" name="notes" />
            <div className="sm:col-span-3">
              <SubmitButton label="Agregar" pendingLabel="Agregando…" />
            </div>
          </form>
        </Card>
      )}

      <Card>
        {active.length === 0 ? (
          <p className="text-sm text-text-muted">Sin servicios activos.</p>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{s.service_name}</p>
                  <p className="text-xs text-text-muted">
                    {s.service_category} · desde {formatDate(s.started_at)}
                    {s.fee ? ` · ${formatCurrency(s.fee)}/mes` : ""}
                  </p>
                </div>
                <form
                  action={removeClientService}
                  onSubmit={(e) => {
                    if (!confirm(`¿Dar de baja "${s.service_name}"?`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button type="submit" className="text-text-muted hover:text-danger" aria-label="Dar de baja">
                    <Trash2 size={16} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {ended.length > 0 && (
        <Card>
          <CardTitle>Servicios finalizados</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {ended.map((s) => (
              <li key={s.id} className="py-3 text-sm text-text-muted">
                {s.service_name} · {formatDate(s.started_at)} – {s.ended_at ? formatDate(s.ended_at) : "?"}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PortalUsersCard({
  clientId,
  companyUsers,
  pendingInvites,
}: {
  clientId: string;
  companyUsers: PortalCompanyUser[];
  pendingInvites: PendingInvite[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState<InviteClientUserState, FormData>(inviteClientUser, {});

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Usuarios del portal</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Invitar"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Pueden entrar a su propio portal (tickets, contenido para aprobar, métricas, facturación) en{" "}
        <code>/portal</code>.
      </p>

      {showForm && (
        <form action={formAction} className="mt-4 grid gap-4 rounded-xl border border-border bg-surface-hover p-4 sm:grid-cols-3">
          <input type="hidden" name="client_id" value={clientId} />
          <Input label="Email" name="email" type="email" required />
          <Select label="Rol" name="client_role" defaultValue="member">
            <option value="owner">Titular</option>
            <option value="member">Miembro</option>
          </Select>
          {state.error && <p className="text-sm text-danger sm:col-span-3">{state.error}</p>}
          <div className="sm:col-span-3">
            <SubmitButton label="Enviar invitación" pendingLabel="Enviando…" />
          </div>
        </form>
      )}

      {state.sent && (
        <p className="mt-4 text-sm text-success">Invitación enviada a {state.sent.email}.</p>
      )}

      <ul className="mt-4 divide-y divide-border">
        {companyUsers.length === 0 && <p className="text-sm text-text-muted">Sin accesos al portal todavía.</p>}
        {companyUsers.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="text-sm text-text-primary">{u.full_name}</p>
              <p className="text-xs text-text-muted">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={u.client_role === "owner" ? "accent" : "neutral"}>
                {CLIENT_PORTAL_ROLE_LABELS[u.client_role as ClientPortalRole]}
              </Badge>
              {!u.active && <Badge tone="warning">Inactivo</Badge>}
              <form action={setClientUserActive}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="active" value={String(!u.active)} />
                <button type="submit" className="text-text-muted hover:text-danger" aria-label={u.active ? "Desactivar" : "Reactivar"}>
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {pendingInvites.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Invitaciones pendientes</p>
          <ul className="mt-2 divide-y divide-border">
            {pendingInvites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-sm text-text-muted">{i.email}</span>
                <form action={cancelInvite}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button type="submit" className="text-xs text-danger hover:underline">
                    Cancelar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={startClientPreview} className="mt-4 border-t border-border pt-3">
        <input type="hidden" name="client_id" value={clientId} />
        <button type="submit" className="text-xs text-accent hover:underline">
          Ver como este cliente →
        </button>
      </form>
    </Card>
  );
}

function EquipoTab({
  clientId,
  team,
  allProfiles,
  companyUsers,
  pendingInvites,
}: {
  clientId: string;
  team: ClientTeamRow[];
  allProfiles: Pick<Profile, "id" | "full_name" | "role">[];
  companyUsers: PortalCompanyUser[];
  pendingInvites: PendingInvite[];
}) {
  const [showForm, setShowForm] = useState(false);
  const assignedIds = new Set(team.map((t) => t.profile_id));
  const available = allProfiles.filter((p) => !assignedIds.has(p.id));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <CardTitle>Equipo asignado</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Asignar persona"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form action={addTeamMember} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="client_id" value={clientId} />
            <Select label="Persona" name="profile_id" required defaultValue="">
              <option value="" disabled>
                Elegí una persona
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} · {ROLE_LABELS[p.role]}
                </option>
              ))}
            </Select>
            <Input label="Rol en la cuenta" name="role_on_account" placeholder="Ej: desarrollador, community manager" />
            <div className="sm:col-span-3">
              <SubmitButton label="Asignar" pendingLabel="Asignando…" />
            </div>
          </form>
        </Card>
      )}

      <Card>
        {team.length === 0 ? (
          <p className="text-sm text-text-muted">Sin nadie asignado todavía.</p>
        ) : (
          <ul className="divide-y divide-border">
            {team.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{t.full_name}</p>
                  <p className="text-xs text-text-muted">{t.role_on_account}</p>
                </div>
                <form action={removeTeamMember}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button type="submit" className="text-text-muted hover:text-danger" aria-label="Quitar">
                    <Trash2 size={16} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <PortalUsersCard clientId={clientId} companyUsers={companyUsers} pendingInvites={pendingInvites} />
    </div>
  );
}

function RentabilidadCard({
  client,
  team,
  mrr,
}: {
  client: Client;
  team: ClientTeamRow[];
  mrr: number;
}) {
  const [costsState, costsAction] = useFormState<FinanceActionState, FormData>(updateDirectCosts, {});
  const teamCost = team.reduce((sum, t) => sum + (t.monthly_cost_allocation ?? 0), 0);
  const directCosts = client.monthly_direct_costs ?? 0;
  const margin = mrr - teamCost - directCosts;
  const marginPct = mrr > 0 ? (margin / mrr) * 100 : null;

  return (
    <Card>
      <CardTitle>Rentabilidad</CardTitle>
      <p className="mt-1 text-xs text-text-muted">
        Costos cargados a mano por un admin -- todavía no hay time-tracking real.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">Ingresos (MRR)</dt>
          <dd className="mt-0.5 text-sm text-text-primary">{formatCurrency(mrr)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">Costo de equipo</dt>
          <dd className="mt-0.5 text-sm text-text-primary">{formatCurrency(teamCost)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">Costos directos</dt>
          <dd className="mt-0.5 text-sm text-text-primary">{formatCurrency(directCosts)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">Margen</dt>
          <dd className="mt-0.5 flex items-center gap-2 text-sm font-medium text-text-primary">
            {formatCurrency(margin)}
            {marginPct != null && (
              <Badge tone={margin < 0 ? "danger" : margin / mrr < 0.2 ? "warning" : "success"}>
                {marginPct.toFixed(0)}%
              </Badge>
            )}
          </dd>
        </div>
      </dl>

      <form action={costsAction} className="mt-4 flex items-end gap-3 border-t border-border pt-4">
        <input type="hidden" name="client_id" value={client.id} />
        <Input
          label="Costos directos mensuales"
          name="monthly_direct_costs"
          type="number"
          min={0}
          step="0.01"
          defaultValue={client.monthly_direct_costs ?? ""}
          className="max-w-[200px]"
        />
        <Button type="submit" variant="secondary">
          Guardar
        </Button>
      </form>
      {costsState.error && <p className="mt-2 text-sm text-danger">{costsState.error}</p>}

      {team.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Costo asignado por persona
          </p>
          <ul className="mt-2 divide-y divide-border">
            {team.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-text-primary">{t.full_name}</span>
                <form
                  action={(fd) => {
                    fd.set("client_id", client.id);
                    updateTeamCostAllocation(fd);
                  }}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={t.id} />
                  <input
                    type="number"
                    name="monthly_cost_allocation"
                    min={0}
                    step="0.01"
                    defaultValue={t.monthly_cost_allocation ?? ""}
                    placeholder="0"
                    className="w-28 rounded-xl border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                  />
                  <button type="submit" className="text-xs text-accent hover:underline">
                    Guardar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function FinanzasTab({
  client,
  team,
  agreements,
  payments,
}: {
  client: Client;
  team: ClientTeamRow[];
  agreements: AgreementRow[];
  payments: PaymentHistoryRow[];
}) {
  const mrr = agreements.filter((a) => a.active).reduce((sum, a) => sum + a.amount, 0);
  return (
    <div className="flex flex-col gap-5">
      <RentabilidadCard client={client} team={team} mrr={mrr} />
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Acuerdos recurrentes</CardTitle>
          <Link href="/payments/in" className="text-xs text-accent hover:underline">
            Gestionar en Cobros →
          </Link>
        </div>
        {agreements.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Sin acuerdos recurrentes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {agreements.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-text-primary">{a.concept}</p>
                  <p className="text-xs text-text-muted">día {a.billing_day} de cada mes</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{formatCurrency(a.amount)}</span>
                  {!a.active && <Badge tone="neutral">Inactivo</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardTitle>Últimos cobros</CardTitle>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Sin cobros registrados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-text-primary">{p.concept}</p>
                  <p className="text-xs text-text-muted">
                    {p.date_received ? formatDate(p.date_received) : "Pendiente de cobro"}
                    {p.period_month && ` · ${formatMonthLabel(p.period_month)}`}
                  </p>
                </div>
                <span className="text-sm font-medium text-text-primary">{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function ClientDetailTabs({
  access,
  client,
  services,
  team,
  allServices,
  allProfiles,
  agreements,
  payments,
  canSeeFinance,
  currentPlan,
  deliverables,
  checklistCompleted,
  opportunities,
  campaigns,
  contentItems,
  brandKit,
  metaConnections,
  metaAssets,
  dailySpend,
  alerts,
  companyUsers,
  pendingInvites,
  canSeeSystems,
  projects,
  milestonesByProject,
  openTicketsCount,
  avgCsat,
  reports,
  sharedFiles,
  contentComments,
  techAssets,
  ghlBots,
  initialTab,
  metaOAuthEnabled,
}: {
  initialTab?: string;
  metaOAuthEnabled: boolean;
  access: ClientAccess;
  client: Client;
  services: ClientServiceRow[];
  team: ClientTeamRow[];
  allServices: ServiceCatalogItem[];
  allProfiles: Pick<Profile, "id" | "full_name" | "role">[];
  agreements: AgreementRow[];
  payments: PaymentHistoryRow[];
  canSeeFinance: boolean;
  currentPlan: MarketingPlan | null;
  deliverables: DeliverableProgress[];
  checklistCompleted: Set<string>;
  opportunities: string[];
  campaigns: Campaign[];
  contentItems: ContentItem[];
  brandKit: BrandKit | null;
  metaConnections: MetaConnection[];
  metaAssets: MetaAsset[];
  dailySpend: DailySpendPoint[];
  alerts: Alert[];
  companyUsers: PortalCompanyUser[];
  pendingInvites: PendingInvite[];
  canSeeSystems: boolean;
  projects: Project[];
  milestonesByProject: Map<string, ProjectMilestone[]>;
  openTicketsCount: number;
  avgCsat: number | null;
  reports: ClientReport[];
  sharedFiles: ClientFile[];
  contentComments: ContentCommentRow[];
  techAssets: TechAsset[];
  ghlBots: GhlBot[];
}) {
  const activeServicesCount = services.filter((s) => s.status === "active").length;
  const { full } = access;

  const tabs: TabItem[] = [
    {
      id: "resumen",
      label: "Resumen",
      content: (
        <div className="flex flex-col gap-5">
          <ResumenTab client={client} canEdit={full} />
          <Card className="max-w-2xl">
            <div className="flex items-center justify-between">
              <CardTitle>Tickets</CardTitle>
              <div className="flex items-center gap-2">
                {avgCsat != null && <Badge tone="accent">CSAT {avgCsat.toFixed(1)}/5</Badge>}
                <Badge tone={openTicketsCount > 0 ? "warning" : "neutral"}>
                  {openTicketsCount} abierto{openTicketsCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>
            <Link href={`/tickets?client=${client.id}`} className="mt-2 inline-block text-xs text-accent hover:underline">
              Ver tickets de este cliente →
            </Link>
          </Card>
        </div>
      ),
    },
  ];

  if (full) {
    tabs.push(
      {
        id: "servicios",
        label: `Servicios (${activeServicesCount})`,
        content: <ServiciosTab clientId={client.id} services={services} catalog={allServices} />,
      },
      {
        id: "equipo",
        label: `Equipo (${team.length})`,
        content: (
          <EquipoTab
            clientId={client.id}
            team={team}
            allProfiles={allProfiles}
            companyUsers={companyUsers}
            pendingInvites={pendingInvites}
          />
        ),
      }
    );
  }

  tabs.push({
    id: "marketing",
    label: "Marketing",
    content: (
      <MarketingTab
        clientId={client.id}
        plan={currentPlan}
        deliverables={deliverables}
        checklistCompleted={checklistCompleted}
        opportunities={opportunities}
        campaigns={campaigns}
        contentItems={contentItems}
        brandKit={brandKit}
        assignable={allProfiles}
        canApprovePlan={full}
        comments={contentComments}
        clientName={client.name}
        canUseAi={can(access.profile, "ai.use")}
      />
    ),
  });

  tabs.push({
    id: "metricas",
    label: "Métricas",
    content: (
      <MetricsTab
        metaOAuthEnabled={metaOAuthEnabled}
        clientId={client.id}
        connections={metaConnections}
        assets={metaAssets}
        dailySpend={dailySpend}
        alerts={alerts}
      />
    ),
  });

  if (full) {
    tabs.push({
      id: "portal",
      label: "Portal",
      content: <PortalContentTab clientId={client.id} reports={reports} files={sharedFiles} />,
    });
  }

  if (canSeeSystems) {
    tabs.push({
      id: "sistemas",
      label: "Sistemas",
      content: (
        <SystemsTab
          clientId={client.id}
          projects={projects}
          milestonesByProject={milestonesByProject}
          techAssets={techAssets}
          ghlBots={ghlBots}
          assignable={allProfiles}
        />
      ),
    });
  }

  if (canSeeFinance) {
    tabs.push({
      id: "finanzas",
      label: "Finanzas",
      content: <FinanzasTab client={client} team={team} agreements={agreements} payments={payments} />,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{client.name}</h1>
          <Badge tone={STATUS_TONE[client.status]}>{CLIENT_STATUS_LABELS[client.status]}</Badge>
        </div>
        <p className="text-sm text-text-muted">
          {[client.industry, client.city].filter(Boolean).join(" · ") || "Sin rubro/ciudad cargado"}
        </p>
      </div>
      <Tabs items={tabs} defaultTab={tabs.some((t) => t.id === initialTab) ? initialTab : undefined} />
    </div>
  );
}
