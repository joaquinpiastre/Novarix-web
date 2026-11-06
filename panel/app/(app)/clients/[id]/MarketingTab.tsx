"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import {
  CAMPAIGN_STATUS_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_ORDER,
  MARKETING_PLAN_STATUS_LABELS,
  type Campaign,
  type CampaignStatus,
  type ContentItem,
  type ContentStatus,
  type MarketingPlan,
  type Profile,
} from "@/lib/types/domain";
import { CHECKLIST_ITEMS } from "@/lib/marketing/checklist";
import {
  createCampaign,
  createContentItem,
  createMarketingPlan,
  deleteContentItem,
  saveBrandKit,
  toggleChecklistItem,
  updateCampaignStatus,
  updateContentStatus,
  updateMarketingPlanStatus,
  type ActionState,
} from "./marketingActions";
import type { DeliverableProgress } from "./page";
import type { BrandKit } from "@/lib/types/domain";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? pendingLabel : label}
    </Button>
  );
}

function PlanCard({
  clientId,
  plan,
  deliverables,
  canApprove,
}: {
  clientId: string;
  plan: MarketingPlan | null;
  deliverables: DeliverableProgress[];
  canApprove: boolean;
}) {
  const [showForm, setShowForm] = useState(!plan);
  const [state, formAction] = useFormState<ActionState, FormData>(createMarketingPlan, {});
  const [rows, setRows] = useState(1);

  if (plan && !showForm) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Plan de marketing vigente</CardTitle>
          <div className="flex items-center gap-2">
            <Badge tone={plan.status === "active" ? "success" : plan.status === "draft" ? "neutral" : "accent"}>
              {MARKETING_PLAN_STATUS_LABELS[plan.status]}
            </Badge>
            <Button variant="ghost" onClick={() => setShowForm(true)}>
              Nuevo plan
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {formatDate(plan.period_start)} – {formatDate(plan.period_end)}
        </p>
        {plan.objectives && <p className="mt-3 text-sm text-text-primary">{plan.objectives}</p>}
        {plan.budget_ads != null && (
          <p className="mt-2 text-sm text-text-muted">
            Presupuesto de pauta: <span className="text-text-primary">{formatCurrency(plan.budget_ads)}</span>
          </p>
        )}
        {deliverables.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Entregables comprometidos
            </p>
            <ul className="mt-2 space-y-1.5">
              {deliverables.map((d) => (
                <li key={d.format} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-text-primary">{d.format}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, (d.delivered / d.committed) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-text-muted">
                    {d.delivered}/{d.committed}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {canApprove && plan.status === "draft" && (
          <form action={updateMarketingPlanStatus} className="mt-4">
            <input type="hidden" name="id" value={plan.id} />
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="status" value="approved" />
            <Button type="submit" variant="secondary">
              Aprobar plan
            </Button>
          </form>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>{plan ? "Nuevo plan de marketing" : "Crear plan de marketing"}</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="client_id" value={clientId} />
        <Input label="Desde" name="period_start" type="date" required />
        <Input label="Hasta" name="period_end" type="date" required />
        <Input label="Presupuesto de pauta (opcional)" name="budget_ads" type="number" min={0} step="0.01" />
        <Input label="Canales (separados por coma)" name="channels" placeholder="Instagram, Google Ads" />
        <div className="sm:col-span-2">
          <Textarea label="Objetivos" name="objectives" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Público objetivo" name="target_audience" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Propuesta de valor" name="value_proposition" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-text-primary">Entregables comprometidos</p>
          <div className="mt-2 flex flex-col gap-2">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Input name="deliverable_format" placeholder="Formato (ej: post)" className="flex-1" />
                <Input
                  name="deliverable_committed"
                  type="number"
                  min={0}
                  placeholder="Cantidad"
                  className="w-32"
                />
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" className="mt-2" onClick={() => setRows((r) => r + 1)}>
            <Plus size={14} /> Agregar entregable
          </Button>
        </div>
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <SubmitButton label="Crear plan" pendingLabel="Creando…" />
          {plan && (
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function ChecklistCard({
  clientId,
  completed,
  opportunities,
}: {
  clientId: string;
  completed: Set<string>;
  opportunities: string[];
}) {
  const score = completed.size;
  const total = CHECKLIST_ITEMS.length;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Diagnóstico</CardTitle>
        <span className="text-sm font-medium text-text-primary">
          {score}/{total}
        </span>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {CHECKLIST_ITEMS.map((item) => {
          const checked = completed.has(item.key);
          return (
            <li key={item.key} className="flex items-center justify-between gap-3 py-2">
              <label className="flex flex-1 items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  defaultChecked={checked}
                  className="h-4 w-4 accent-accent"
                  onChange={(e) => {
                    const fd = new FormData();
                    fd.set("client_id", clientId);
                    fd.set("item_key", item.key);
                    fd.set("completed", String(e.target.checked));
                    toggleChecklistItem(fd);
                  }}
                />
                {item.label}
              </label>
            </li>
          );
        })}
      </ul>
      {opportunities.length > 0 && (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Oportunidades de venta
          </p>
          <p className="mt-1 text-sm text-text-primary">{opportunities.join(" · ")}</p>
        </div>
      )}
    </Card>
  );
}

function CampaignsCard({ clientId, campaigns }: { clientId: string; campaigns: Campaign[] }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(createCampaign, {});

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Campañas</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Nueva campaña"}
        </Button>
      </div>

      {showForm && (
        <form action={formAction} className="mt-4 grid gap-4 rounded-lg border border-border bg-surface-hover p-4 sm:grid-cols-2">
          <input type="hidden" name="client_id" value={clientId} />
          <Input label="Nombre" name="name" required />
          <Select label="Canal" name="channel" required defaultValue="meta">
            <option value="meta">Meta (Instagram/Facebook)</option>
            <option value="google">Google Ads</option>
            <option value="other">Otro</option>
          </Select>
          <Input label="Objetivo" name="objective" />
          <Input label="Presupuesto" name="budget" type="number" min={0} step="0.01" />
          <Input label="Desde" name="start_date" type="date" />
          <Input label="Hasta" name="end_date" type="date" />
          {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <SubmitButton label="Crear campaña" pendingLabel="Creando…" />
          </div>
        </form>
      )}

      {campaigns.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Sin campañas cargadas.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {campaigns.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{c.name}</p>
                <p className="text-xs text-text-muted">
                  {c.channel} {c.budget ? `· ${formatCurrency(c.budget)}` : ""}
                </p>
              </div>
              <form
                action={(fd) => {
                  fd.set("client_id", clientId);
                  updateCampaignStatus(fd);
                }}
              >
                <input type="hidden" name="id" value={c.id} />
                <select
                  name="status"
                  defaultValue={c.status}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                >
                  {(Object.entries(CAMPAIGN_STATUS_LABELS) as [CampaignStatus, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ContentCalendar({
  clientId,
  items,
  assignable,
}: {
  clientId: string;
  items: ContentItem[];
  assignable: Pick<Profile, "id" | "full_name" | "role">[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(createContentItem, {});

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Calendario de contenido</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Nueva pieza"}
        </Button>
      </div>

      {showForm && (
        <form action={formAction} className="mt-4 grid gap-4 rounded-lg border border-border bg-surface-hover p-4 sm:grid-cols-2">
          <input type="hidden" name="client_id" value={clientId} />
          <Input label="Título" name="title" required />
          <Select label="Canal" name="channel" required defaultValue="instagram">
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="other">Otro</option>
          </Select>
          <Select label="Formato" name="format" required defaultValue="post">
            <option value="post">Post</option>
            <option value="carrusel">Carrusel</option>
            <option value="reel">Reel</option>
            <option value="historia">Historia</option>
            <option value="anuncio">Anuncio</option>
          </Select>
          <Input label="Fecha programada" name="scheduled_at" type="datetime-local" />
          <div className="sm:col-span-2">
            <Textarea label="Copy" name="copy" rows={2} />
          </div>
          <Input label="Link a archivo (Drive/Canva/etc.)" name="attachment_url" />
          <Select label="Responsable" name="assigned_to" defaultValue="">
            <option value="">Sin asignar</option>
            {assignable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
          {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <SubmitButton label="Agregar" pendingLabel="Agregando…" />
          </div>
        </form>
      )}

      <div className="mt-4 grid gap-3 overflow-x-auto pb-2 lg:grid-cols-7">
        {CONTENT_STATUS_ORDER.map((status) => (
          <div key={status} className="min-w-[180px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {CONTENT_STATUS_LABELS[status]}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {items
                .filter((i) => i.status === status)
                .map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-surface-hover p-2.5">
                    <p className="text-xs font-medium text-text-primary">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {item.channel} · {item.format}
                    </p>
                    {item.scheduled_at && (
                      <p className="mt-0.5 text-[11px] text-text-muted">{formatDate(item.scheduled_at)}</p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <select
                        defaultValue={item.status}
                        onChange={(e) => {
                          const fd = new FormData();
                          fd.set("id", item.id);
                          fd.set("client_id", clientId);
                          fd.set("status", e.target.value);
                          updateContentStatus(fd);
                        }}
                        className="flex-1 rounded border border-border bg-surface px-1.5 py-1 text-[11px] text-text-primary"
                      >
                        {CONTENT_STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {CONTENT_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label="Eliminar"
                        className="text-text-muted hover:text-danger"
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("id", item.id);
                          fd.set("client_id", clientId);
                          deleteContentItem(fd);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BrandKitCard({ clientId, brandKit }: { clientId: string; brandKit: BrandKit | null }) {
  const [state, formAction] = useFormState<ActionState, FormData>(saveBrandKit, {});

  return (
    <Card>
      <CardTitle>Kit de marca</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="client_id" value={clientId} />
        <Input label="Logo (link)" name="logo_url" defaultValue={brandKit?.logo_url ?? ""} />
        <Input
          label="Paleta de colores"
          name="color_palette"
          placeholder="#7b2ff7, #a855f7"
          defaultValue={brandKit?.color_palette ?? ""}
        />
        <Input label="Tipografías" name="fonts" defaultValue={brandKit?.fonts ?? ""} />
        <Input label="Canva (link)" name="canva_url" defaultValue={brandKit?.canva_url ?? ""} />
        <div className="sm:col-span-2">
          <Textarea
            label="Tono de voz"
            name="tone_of_voice"
            rows={2}
            defaultValue={brandKit?.tone_of_voice ?? ""}
          />
        </div>
        <Input
          label="Referencias (link)"
          name="references_url"
          defaultValue={brandKit?.references_url ?? ""}
        />
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton label="Guardar" pendingLabel="Guardando…" />
        </div>
      </form>
    </Card>
  );
}

export function MarketingTab({
  clientId,
  plan,
  deliverables,
  checklistCompleted,
  opportunities,
  campaigns,
  contentItems,
  brandKit,
  assignable,
  canApprovePlan,
}: {
  clientId: string;
  plan: MarketingPlan | null;
  deliverables: DeliverableProgress[];
  checklistCompleted: Set<string>;
  opportunities: string[];
  campaigns: Campaign[];
  contentItems: ContentItem[];
  brandKit: BrandKit | null;
  assignable: Pick<Profile, "id" | "full_name" | "role">[];
  canApprovePlan: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <PlanCard clientId={clientId} plan={plan} deliverables={deliverables} canApprove={canApprovePlan} />
        <ChecklistCard clientId={clientId} completed={checklistCompleted} opportunities={opportunities} />
      </div>
      <ContentCalendar clientId={clientId} items={contentItems} assignable={assignable} />
      <div className="grid gap-5 lg:grid-cols-2">
        <CampaignsCard clientId={clientId} campaigns={campaigns} />
        <BrandKitCard clientId={clientId} brandKit={brandKit} />
      </div>
    </div>
  );
}
