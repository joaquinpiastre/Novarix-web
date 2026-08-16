"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSessionProfile, requireAdmin } from "@/lib/auth/getSessionProfile";
import type { TaskStatus } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

export async function createTask(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requireAdmin();

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

  // Non-admins may only flip the status of their own assigned tasks — the
  // UPDATE structurally never touches any other column, and the WHERE
  // clause below is the sole authorization boundary (there's no RLS
  // backing this up anymore, so it has to hold on its own).
  if (profile.role === "admin") {
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
  await requireAdmin();
  await query("delete from tasks where id = $1", [id]);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
