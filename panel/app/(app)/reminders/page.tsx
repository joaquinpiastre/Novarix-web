import { requireAdmin } from "@/lib/auth/getSessionProfile";
import { query } from "@/lib/db";
import { RemindersClient, type ReminderRow } from "./RemindersClient";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const { userId } = await requireAdmin();

  const reminders = await query<ReminderRow>(
    "select id, title, remind_at, done from reminders where owner_id = $1 order by remind_at asc",
    [userId]
  );

  return <RemindersClient reminders={reminders} />;
}
