"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/requirePermission";
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

  await query(
    "insert into tasks (title, description, assigned_to, due_date, created_by) values ($1, $2, $3, $4, $5)",
    [title, description || null, assigned_to, due_date, userId]
  );

  revalidatePath("/tasks");
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
  await requirePermission("tasks.manage");
  await query("delete from tasks where id = $1", [id]);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
