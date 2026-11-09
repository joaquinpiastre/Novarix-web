import { redirect } from "next/navigation";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can } from "@/lib/auth/permissions";
import { query, queryOne } from "@/lib/db";
import { listMarketers } from "@/lib/marketing/contentItems";
import { parseLocalDateTime } from "@/lib/utils/dates";
import { CalendarView, type CalendarItem } from "./CalendarView";

export const dynamic = "force-dynamic";

const ITEM_SELECT = `
  select ci.*, c.name as client_name, p.full_name as assignee_name
  from content_items ci
  join clients c on c.id = ci.client_id
  left join profiles p on p.id = ci.assigned_to`;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { m?: string; client?: string; person?: string; item?: string };
}) {
  const { userId, profile } = await getSessionProfile();
  const full = can(profile, "marketing.view_all");
  if (!full && profile.role !== "marketing") redirect("/dashboard");

  const month = /^\d{4}-\d{2}$/.test(searchParams.m ?? "") ? searchParams.m! : format(new Date(), "yyyy-MM");
  // Mediodia UTC: evita que el corrimiento de zona horaria cambie de mes.
  const monthDate = new Date(`${month}-01T12:00:00Z`);
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(format(d, "yyyy-MM-dd"));

  const from = parseLocalDateTime(`${days[0]}T00:00`)!;
  const to = parseLocalDateTime(`${format(addDays(gridEnd, 1), "yyyy-MM-dd")}T00:00`)!;

  // marketing (no admin) solo ve lo que tiene delegado.
  const person = full ? searchParams.person || null : userId;
  const clientFilter = full ? searchParams.client || null : null;
  const filterSql = `
    and ($3::uuid is null or ci.client_id = $3)
    and ($4::uuid is null or ci.assigned_to = $4)`;

  const isUuid = (v: string | null) => !v || /^[0-9a-f-]{36}$/i.test(v);
  const params = [from, to, isUuid(clientFilter) ? clientFilter : null, isUuid(person) ? person : null];

  const [items, unscheduled, clients, marketers] = await Promise.all([
    query<CalendarItem>(
      `${ITEM_SELECT}
       where ((ci.recording_at >= $1 and ci.recording_at < $2) or (ci.scheduled_at >= $1 and ci.scheduled_at < $2))
       ${filterSql}
       order by coalesce(ci.recording_at, ci.scheduled_at)`,
      params
    ),
    query<CalendarItem>(
      `${ITEM_SELECT}
       where ci.recording_at is null and ci.status not in ('programado','publicado')
       -- $1/$2 no aplican aca, pero Postgres exige que todo parametro se use.
       and $1::timestamptz is not null and $2::timestamptz is not null
       ${filterSql}
       order by ci.created_at desc limit 60`,
      params
    ),
    full
      ? query<{ id: string; name: string }>(
          "select id, name from clients where status in ('activo','prospecto') order by name"
        )
      : Promise.resolve([]),
    listMarketers(),
  ]);

  // Link directo a una pieza (ej: desde una notificacion) aunque no caiga en este mes.
  let focused: CalendarItem | null = null;
  if (searchParams.item && isUuid(searchParams.item)) {
    focused =
      items.find((i) => i.id === searchParams.item) ??
      unscheduled.find((i) => i.id === searchParams.item) ??
      (await queryOne<CalendarItem>(`${ITEM_SELECT} where ci.id = $1`, [searchParams.item]));
    if (focused && !full && focused.assigned_to !== userId) focused = null;
  }

  return (
    <CalendarView
      month={month}
      days={days}
      items={items}
      unscheduled={unscheduled}
      focused={focused}
      clients={clients}
      marketers={marketers.map((m) => ({ id: m.id, name: m.full_name }))}
      filters={{ client: clientFilter ?? "", person: full ? person ?? "" : "" }}
      canManage={full}
      canUseAi={can(profile, "ai.use")}
    />
  );
}
