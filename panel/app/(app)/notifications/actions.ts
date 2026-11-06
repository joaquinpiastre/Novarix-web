"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

export async function markNotificationRead(formData: FormData): Promise<void> {
  const { userId } = await getSessionProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await query("update notifications set read = true where id = $1 and profile_id = $2", [
    id,
    userId,
  ]);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const { userId } = await getSessionProfile();
  await query("update notifications set read = true where profile_id = $1 and read = false", [
    userId,
  ]);
  revalidatePath("/", "layout");
}
