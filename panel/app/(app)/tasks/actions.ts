"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/requirePermission";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import type { TaskStatus } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

export async function createTask(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requirePermission("tasks.manage");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assigned_to = String(formData.get("assigned_to") ?? "") || null;
  const due_date = String(formData.get("due_date") ?? "") || null;

  if (!title) return { error: "El título es obligatorio." };

  const rows = await query<{ id: string }>(
    "insert into tasks (title, description, assigned_to, due_date, created_by) values ($1, $2, $3, $4, $5) returning id",
    [title, description || null, assigned_to, due_date, userId]
  );
  await recordAudit({ actorId: userId, action: "tasks.create", entityType: "task", entityId: rows[0]?.id ?? null, after: { title, assigned_to, due_date }, ip: getClientIp() });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return {};
}

/** Edicion completa de una tarea (titulo, descripcion, responsable, vencimiento, estado). Solo tasks.manage. */
export async function updateTask(taskId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requirePermission("tasks.manage");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assigned_to = String(formData.get("assigned_to") ?? "") || null;
  const due_date = String(formData.get("due_date") ?? "") || null;
  const status = String(formData.get("status") ?? "") as TaskStatus;

  if (!title) return { error: "El título es obligatorio." };
  if (!["pending", "in_progress", "done"].includes(status)) return { error: "Estado inválido." };

  const before = await query("select title, description, assigned_to, due_date, status from tasks where id = $1", [taskId]);
  if (before.length === 0) return { error: "La tarea ya no existe." };

  await query(
    `update tasks set title = $2, description = $3, assigned_to = $4, due_date = $5, status = $6, updated_at = now()
     where id = $1`,
    [taskId, title, description || null, assigned_to, due_date, status]
  );
  await recordAudit({
    actorId: userId,
    action: "tasks.update",
    entityType: "task",
    entityId: taskId,
    before: before[0],
    after: { title, description, assigned_to, due_date, status },
    ip: getClientIp(),
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return {};
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { userId, profile } = await getSessionProfile();

  // Quien no tiene tasks.manage solo puede cambiar el estado de tareas
  // asignadas a si mismo -- el UPDATE nunca toca otra columna, y el WHERE
  // de abajo es la unica barrera de autorizacion (no hay RLS respaldando
  // esto, tiene que valerse por si solo).
  if (can(profile, "tasks.manage")) {
    await query("update tasks set status = $1, updated_at = now() where id = $2", [status, taskId]);
  } else {
    await query(
      "update tasks set status = $1, updated_at = now() where id = $2 and assigned_to = $3",
      [status, taskId, userId]
    );
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(id: string) {
  const { userId } = await requirePermission("tasks.manage");
  const before = await query("select title, assigned_to, status from tasks where id = $1", [id]);
  await query("delete from tasks where id = $1", [id]);
  await recordAudit({ actorId: userId, action: "tasks.delete", entityType: "task", entityId: id, before: before[0], ip: getClientIp() });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
