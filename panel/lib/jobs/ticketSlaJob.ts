import "server-only";
import { getBoss, TICKET_DAILY_DIGEST_JOB, TICKET_SLA_CHECK_JOB } from "./queue";
import { query } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notifications/create";
import { log } from "@/lib/log";

interface AtRiskTicket {
  id: string;
  number: string;
  title: string;
  assigned_to: string | null;
  client_id: string;
}

async function alreadyNotified(ticketId: string, eventType: string): Promise<boolean> {
  const rows = await query(
    "select 1 from ticket_events where ticket_id = $1 and event_type = $2",
    [ticketId, eventType]
  );
  return rows.length > 0;
}

async function checkSlaBreaches(): Promise<void> {
  const overdue = await query<AtRiskTicket>(`
    select id, number, title, assigned_to, client_id from support_tickets
    where sla_due_at is not null and first_response_at is null
      and status not in ('resuelto', 'cerrado') and sla_due_at < now()
  `);

  for (const t of overdue) {
    if (await alreadyNotified(t.id, "sla_breach_notified")) continue;

    const recipients = new Set<string>();
    if (t.assigned_to) recipients.add(t.assigned_to);
    const admins = await query<{ id: string }>("select id from profiles where role in ('admin', 'marketing_admin')");
    admins.forEach((a) => recipients.add(a.id));

    await notifyMany(
      Array.from(recipients),
      "ticket_sla_breach",
      `SLA vencido: ${t.number}`,
      t.title,
      `/tickets/${t.id}`
    );
    await query(
      "insert into ticket_events (ticket_id, event_type, to_value) values ($1, 'sla_breach_notified', 'true')",
      [t.id]
    );
  }

  // en riesgo: vence en menos de 1 hora y todavia no se avisó
  const atRisk = await query<AtRiskTicket>(`
    select id, number, title, assigned_to, client_id from support_tickets
    where sla_due_at is not null and first_response_at is null
      and status not in ('resuelto', 'cerrado')
      and sla_due_at between now() and now() + interval '1 hour'
  `);

  for (const t of atRisk) {
    if (!t.assigned_to) continue;
    if (await alreadyNotified(t.id, "sla_at_risk_notified")) continue;
    await notify(t.assigned_to, "ticket_sla_at_risk", `SLA por vencer: ${t.number}`, t.title, `/tickets/${t.id}`);
    await query(
      "insert into ticket_events (ticket_id, event_type, to_value) values ($1, 'sla_at_risk_notified', 'true')",
      [t.id]
    );
  }
}

async function sendDailyDigest(): Promise<void> {
  const row = await query<{ n: string }>(
    "select count(*)::text as n from support_tickets where status not in ('resuelto', 'cerrado')"
  );
  const openCount = Number(row[0]?.n ?? 0);
  if (openCount === 0) return;

  const admins = await query<{ id: string }>("select id from profiles where role = 'admin'");
  await notifyMany(
    admins.map((a) => a.id),
    "tickets_daily_digest",
    `Tickets abiertos: ${openCount}`,
    undefined,
    "/tickets"
  );
}

export async function startTicketSlaJob(): Promise<void> {
  const boss = await getBoss();

  await boss.work(TICKET_SLA_CHECK_JOB, async () => {
    log.info("ticket sla check: arrancando");
    await checkSlaBreaches();
    log.info("ticket sla check: terminado");
  });
  await boss.schedule(TICKET_SLA_CHECK_JOB, "*/30 * * * *", {}, { tz: "America/Argentina/Mendoza" });

  await boss.work(TICKET_DAILY_DIGEST_JOB, async () => {
    log.info("ticket daily digest: arrancando");
    await sendDailyDigest();
    log.info("ticket daily digest: terminado");
  });
  await boss.schedule(TICKET_DAILY_DIGEST_JOB, "0 9 * * *", {}, { tz: "America/Argentina/Mendoza" });

  log.info("ticket sla job registrado");
}
