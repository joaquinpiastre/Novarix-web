import { requireClient } from "@/lib/auth/requireClient";
import { getProjectMilestones, getProjects } from "@/lib/portal/queries";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import { PROJECT_STATUS_LABELS } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  planning: "neutral",
  in_progress: "accent",
  paused: "warning",
  done: "success",
  cancelled: "danger",
} as const;

export default async function PortalProjectsPage() {
  const { clientId } = await requireClient();
  const projects = await getProjects(clientId);
  const milestones = await getProjectMilestones(projects.map((p) => p.id));
  const milestonesByProject = new Map<string, typeof milestones>();
  for (const m of milestones) {
    const list = milestonesByProject.get(m.project_id) ?? [];
    list.push(m);
    milestonesByProject.set(m.project_id, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Proyectos</h1>
        <p className="text-sm text-text-muted">Estado y próximos pasos de tus proyectos con Novarix.</p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">No tenés proyectos cargados todavía.</p>
        </Card>
      ) : (
        projects.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <CardTitle>{p.name}</CardTitle>
              <Badge tone={STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
            </div>
            {p.description && <p className="mt-2 text-sm text-text-primary">{p.description}</p>}
            {p.due_date && (
              <p className="mt-1 text-xs text-text-muted">Entrega estimada: {formatDate(p.due_date)}</p>
            )}
            {(milestonesByProject.get(p.id) ?? []).length > 0 && (
              <ul className="mt-3 divide-y divide-border border-t border-border pt-2">
                {(milestonesByProject.get(p.id) ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className={m.done ? "text-text-muted line-through" : "text-text-primary"}>
                      {m.title}
                    </span>
                    <span className="text-xs text-text-muted">{m.due_date && formatDate(m.due_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
