"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/getSessionProfile";

export interface ActionState {
  error?: string;
}

export async function createReminder(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "09:00");

  if (!title || !date) return { error: "Completá el título y la fecha." };

  await query("insert into reminders (owner_id, title, remind_at) values ($1, $2, $3)", [
    userId,
    title,
    new Date(`${date}T${time}:00`).toISOString(),
  ]);

  revalidatePath("/reminders");
  return {};
}

export async function toggleReminderDone(id: string, done: boolean) {
  const { userId } = await requireAdmin();
  await query("update reminders set done = $1 where id = $2 and owner_id = $3", [done, id, userId]);
  revalidatePath("/reminders");
}

export async function deleteReminder(id: string) {
  const { userId } = await requireAdmin();
  await query("delete from reminders where id = $1 and owner_id = $2", [id, userId]);
  revalidatePath("/reminders");
}
