"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import {
  PROJECT_STATUS_LABELS,
  TECH_ASSET_TYPE_LABELS,
  type GhlBot,
  type Profile,
  type Project,
  type ProjectMilestone,
  type ProjectStatus,
  type TechAsset,
} from "@/lib/types/domain";
import {
  addMilestone,
  createGhlBot,
  createProject,
  createTechAsset,
  deleteGhlBot,
  deleteMilestone,
  deleteProject,
  deleteTechAsset,
  toggleGhlBotActive,
  toggleMilestone,
  updateProjectStatus,
  type ActionState,
} from "./projectsActions";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? pendingLabel : label}
    </Button>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function expiryTone(expiresAt: string | null): "neutral" | "warning" | "danger" {
  if (!expiresAt) return "neutral";
  const days = (new Date(expiresAt).getTime() - Date.now()) / DAY_MS;
  if (days < 0) return "danger";
  if (days <= 30) return "warning";
  return "neutral";
}

function MilestonesList({
  clientId,
  projectId,
  milestones,
}: {
  clientId: string;
  projectId: string;
  milestones: ProjectMilestone[];
}) {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="mt-3 border-t border-border pt-3">
      <ul className="flex flex-col gap-1.5">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
            <label className="flex flex-1 items-center gap-2 text-text-primary">
              <input
                type="checkbox"
                defaultChecked={m.done}
                className="h-3.5 w-3.5 accent-accent"
                onChange={(e) => {
                  const fd = new FormData();
                  fd.set("id", m.id);
                  fd.set("client_id", clientId);
                  fd.set("done", String(e.target.checked));
                  toggleMilestone(fd);
                }}
              />
              <span className={m.done ? "text-text-muted line-through" : ""}>{m.title}</span>
              {m.due_date && <span className="text-xs text-text-muted">· {formatDate(m.due_date)}</span>}
            </label>
            <button
              type="button"
              aria-label="Eliminar hito"
              className="text-text-muted hover:text-danger"
              onClick={() => {
                const fd = new FormData();
                fd.set("id", m.id);
                fd.set("client_id", clientId);
                deleteMilestone(fd);
              }}
            >
              <Trash2 size={12} />
            </button>
          </li>
        ))}
        {milestones.length === 0 && !showForm && (
          <p className="text-xs text-text-muted">Sin hitos todavía.</p>
        )}
      </ul>
      {showForm ? (
        <form
          action={(fd) => {
            fd.set("client_id", clientId);
            addMilestone(fd);
            setShowForm(false);
          }}
          className="mt-2 flex gap-2"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <Input name="title" placeholder="Nuevo hito" required className="flex-1" />
          <Input name="due_date" type="date" className="w-36" />
          <Button type="submit" variant="secondary">
            Agregar
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-2 text-xs text-accent hover:underline"
        >
          + Agregar hito
        </button>
      )}
    </div>
  );
}

function ProjectsCard({
  clientId,
  projects,
  milestonesByProject,
  assignable,
}: {
  clientId: string;
  projects: Project[];
  milestonesByProject: Map<string, ProjectMilestone[]>;
  assignable: Pick<Profile, "id" | "full_name" | "role">[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(createProject, {});

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Proyectos</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Nuevo proyecto"}
        </Button>
      </div>

      {showForm && (
        <form action={formAction} className="mt-4 grid gap-4 rounded-xl border border-border bg-surface-hover p-4 sm:grid-cols-2">
          <input type="hidden" name="client_id" value={clientId} />
          <Input label="Nombre" name="name" required />
          <Select label="Responsable" name="owner_id" defaultValue="">
            <option value="">Sin asignar</option>
            {assignable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
          <Input label="Inicio" name="start_date" type="date" />
          <Input label="Vencimiento" name="due_date" type="date" />
          <div className="sm:col-span-2">
            <Textarea label="Descripción" name="description" rows={2} />
          </div>
          {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <SubmitButton label="Crear proyecto" pendingLabel="Creando…" />
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Sin proyectos cargados.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {projects.map((p) => (
            <li key={p.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{p.name}</p>
                  {p.due_date && (
                    <p className="text-xs text-text-muted">Vence {formatDate(p.due_date)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <form
                    action={(fd) => {
                      fd.set("client_id", clientId);
                      updateProjectStatus(fd);
                    }}
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <select
                      name="status"
                      defaultValue={p.status}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="rounded-xl border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                    >
                      {(Object.entries(PROJECT_STATUS_LABELS) as [ProjectStatus, string][]).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </form>
                  <button
                    type="button"
                    aria-label="Eliminar proyecto"
                    className="text-text-muted hover:text-danger"
                    onClick={() => {
                      if (!confirm(`¿Eliminar "${p.name}" y sus hitos?`)) return;
                      const fd = new FormData();
                      fd.set("id", p.id);
                      fd.set("client_id", clientId);
                      deleteProject(fd);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {p.description && <p className="mt-1 text-xs text-text-muted">{p.description}</p>}
              <MilestonesList
                clientId={clientId}
                projectId={p.id}
                milestones={milestonesByProject.get(p.id) ?? []}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TechAssetsCard({ clientId, assets }: { clientId: string; assets: TechAsset[] }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(createTechAsset, {});

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Activos técnicos</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Agregar"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Vencimientos de dominio, hosting y SSL — nunca credenciales reales.
      </p>

      {showForm && (
        <form action={formAction} className="mt-4 grid gap-4 rounded-xl border border-border bg-surface-hover p-4 sm:grid-cols-2">
          <input type="hidden" name="client_id" value={clientId} />
          <Select label="Tipo" name="asset_type" defaultValue="domain">
            {(Object.entries(TECH_ASSET_TYPE_LABELS) as [string, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input label="Nombre" name="label" placeholder="ej: miempresa.com.ar" required />
          <Input label="Proveedor" name="provider" placeholder="ej: Hostinger" />
          <Input label="Vence" name="expires_at" type="date" />
          <div className="sm:col-span-2">
            <Textarea label="Notas" name="notes" rows={2} />
          </div>
          {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <SubmitButton label="Agregar" pendingLabel="Agregando…" />
          </div>
        </form>
      )}

      {assets.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Sin activos registrados.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {assets.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{a.label}</p>
                <p className="text-xs text-text-muted">
                  {TECH_ASSET_TYPE_LABELS[a.asset_type]}
                  {a.provider ? ` · ${a.provider}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {a.expires_at && (
                  <Badge tone={expiryTone(a.expires_at)}>Vence {formatDate(a.expires_at)}</Badge>
                )}
                <button
                  type="button"
                  aria-label="Eliminar activo"
                  className="text-text-muted hover:text-danger"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", a.id);
                    fd.set("client_id", clientId);
                    deleteTechAsset(fd);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GhlBotsCard({ clientId, bots }: { clientId: string; bots: GhlBot[] }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(createGhlBot, {});

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Bots GHL</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Agregar"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Registro manual — sin integración en vivo con la API de GoHighLevel.
      </p>

      {showForm && (
        <form action={formAction} className="mt-4 grid gap-4 rounded-xl border border-border bg-surface-hover p-4 sm:grid-cols-2">
          <input type="hidden" name="client_id" value={clientId} />
          <Input label="Nombre" name="name" required />
          <Input label="Location ID de GHL" name="ghl_location_id" />
          <div className="sm:col-span-2">
            <Textarea label="Notas" name="notes" rows={2} />
          </div>
          {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <SubmitButton label="Agregar" pendingLabel="Agregando…" />
          </div>
        </form>
      )}

      {bots.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Sin bots registrados.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {bots.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{b.name}</p>
                {b.ghl_location_id && <p className="text-xs text-text-muted">{b.ghl_location_id}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", b.id);
                    fd.set("client_id", clientId);
                    fd.set("active", String(!b.active));
                    toggleGhlBotActive(fd);
                  }}
                >
                  <Badge tone={b.active ? "success" : "neutral"}>{b.active ? "Activo" : "Inactivo"}</Badge>
                </button>
                <button
                  type="button"
                  aria-label="Eliminar bot"
                  className="text-text-muted hover:text-danger"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", b.id);
                    fd.set("client_id", clientId);
                    deleteGhlBot(fd);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SystemsTab({
  clientId,
  projects,
  milestonesByProject,
  techAssets,
  ghlBots,
  assignable,
}: {
  clientId: string;
  projects: Project[];
  milestonesByProject: Map<string, ProjectMilestone[]>;
  techAssets: TechAsset[];
  ghlBots: GhlBot[];
  assignable: Pick<Profile, "id" | "full_name" | "role">[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <ProjectsCard
        clientId={clientId}
        projects={projects}
        milestonesByProject={milestonesByProject}
        assignable={assignable}
      />
      <TechAssetsCard clientId={clientId} assets={techAssets} />
      <GhlBotsCard clientId={clientId} bots={ghlBots} />
    </div>
  );
}
