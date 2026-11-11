import "server-only";
import { query, queryOne } from "@/lib/db";
import { notifyMany } from "@/lib/notifications/create";
import { daysBetween, todayInMendoza, upcomingCommercialDates, type CommercialDate } from "./commercialDates";

/** Dias de anticipacion con que se avisa de una fecha comercial. */
export const COMMERCIAL_DATE_LEAD_DAYS = Number(process.env.COMMERCIAL_DATE_LEAD_DAYS ?? 21);

export async function customCommercialDates(clientId?: string | null): Promise<CommercialDate[]> {
  const rows = await query<{ id: string; name: string; date: string; notes: string | null; client_id: string | null }>(
    `select id, name, date, notes, client_id from commercial_dates
     where date >= current_date - 1 and ($1::uuid is null or client_id is null or client_id = $1)
     order by date`,
    [clientId ?? null]
  );
  return rows.map((r) => ({
    key: `custom-${r.id}`,
    name: r.name,
    date: r.date,
    estimated: false,
    scope: "propia",
    hint: r.notes ?? "",
    clientId: r.client_id,
  }));
}

/** Corre una vez por dia (job de mantenimiento): avisa una sola vez por fecha, con anticipacion. */
export async function notifyUpcomingCommercialDates(): Promise<void> {
  const today = todayInMendoza();
  const dates = upcomingCommercialDates(today, COMMERCIAL_DATE_LEAD_DAYS, await customCommercialDates(null));
  if (dates.length === 0) return;

  const team = await query<{ id: string }>(
    "select id from profiles where role in ('admin', 'marketing_admin')"
  );
  for (const d of dates) {
    const already = await queryOne("select 1 from commercial_date_notices where key = $1", [d.key]);
    if (already) continue;

    const recipients = new Set(team.map((t) => t.id));
    if (d.clientId) {
      const clientTeam = await query<{ profile_id: string }>("select profile_id from client_team where client_id = $1", [d.clientId]);
      clientTeam.forEach((m) => recipients.add(m.profile_id));
    } else {
      const marketers = await query<{ id: string }>("select id from profiles where role = 'marketing'");
      marketers.forEach((m) => recipients.add(m.id));
    }

    const days = daysBetween(today, d.date);
    await notifyMany(
      Array.from(recipients),
      "commercial_date",
      `${d.name} en ${days} día${days === 1 ? "" : "s"}${d.estimated ? " (fecha estimada)" : ""}`,
      d.hint,
      `/marketing/ideas?tab=fechas${d.clientId ? `&client=${d.clientId}` : ""}`
    );
    await query("insert into commercial_date_notices (key) values ($1) on conflict do nothing", [d.key]);
  }
}
