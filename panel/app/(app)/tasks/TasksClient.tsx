"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, ROLE_LABELS, type TaskStatus, type UserRole } from "@/lib/types/domain";
import { createTask, deleteTask, updateTaskStatus, type ActionState } from "./actions";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee: { full_name: string } | null;
}

interface Collaborator {
  id: string;
  full_name: string;
  role: UserRole;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Guardando…" : "Crear tarea"}
    </Button>
  );
}

function NewTaskForm({ collaborators }: { collaborators: Collaborator[] }) {
  const [state, formAction] = useFormState<ActionState, FormData>(createTask, {});
  return (
    <Card>
      <CardTitle>Nueva tarea</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Título" name="title" required />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Descripción (opcional)" name="description" rows={2} />
        </div>
        <Select label="Asignar a" name="assigned_to" defaultValue="">
          <option value="">Sin asignar</option>
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} · {ROLE_LABELS[c.role]}
            </option>
          ))}
        </Select>
        <Input label="Vencimiento (opcional)" name="due_date" type="date" />
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}

function TaskCard({
  task,
  canEdit,
  isAdmin,
}: {
  task: TaskRow;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{task.title}</p>
        {isAdmin && (
          <form action={deleteTask.bind(null, task.id)}>
            <button type="submit" className="text-text-muted hover:text-danger" aria-label="Eliminar tarea">
              <Trash2 size={15} />
            </button>
          </form>
        )}
      </div>
      {task.description && <p className="text-xs text-text-muted">{task.description}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <span>{task.assignee?.full_name ?? "Sin asignar"}</span>
        {task.due_date && <span>· vence {formatDate(task.due_date)}</span>}
      </div>
      {canEdit ? (
        <Select
          value={task.status}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() => {
              updateTaskStatus(task.id, e.target.value as TaskStatus);
            })
          }
          className="mt-1"
        >
          {TASK_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      ) : (
        <Badge tone={task.status === "done" ? "success" : task.status === "in_progress" ? "accent" : "neutral"}>
          {TASK_STATUS_LABELS[task.status]}
        </Badge>
      )}
    </Card>
  );
}

export function TasksClient({
  tasks,
  collaborators,
  isAdmin,
  currentUserId,
}: {
  tasks: TaskRow[];
  collaborators: Collaborator[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Tareas</h1>
          <p className="text-sm text-text-muted">
            {isAdmin ? "Todas las tareas del equipo." : "Tus tareas y las sin asignar."}
          </p>
        </div>
        {isAdmin && (
          <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            {showForm ? "Cerrar" : "Nueva tarea"}
          </Button>
        )}
      </div>

      {isAdmin && showForm && <NewTaskForm collaborators={collaborators} />}

      <div className="grid gap-4 md:grid-cols-3">
        {TASK_STATUS_ORDER.map((status) => (
          <div key={status} className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {TASK_STATUS_LABELS[status]}
            </p>
            {tasks
              .filter((t) => t.status === status)
              .map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  isAdmin={isAdmin}
                  canEdit={isAdmin || t.assigned_to === currentUserId}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
