import "server-only";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notifications/create";
import { parseLocalDateTime } from "@/lib/utils/dates";
import { CONTENT_STATUS_ORDER, type ContentItem, type ContentStatus } from "@/lib/types/domain";
import {
  CONTENT_ASSIGNABLE_ROLES,
  CONTENT_FORMAT_VALUES,
  SOCIAL_NETWORK_VALUES,
} from "./content";

// Alta/edicion de piezas de contenido en un solo lugar: lo usan el
// calendario de produccion, la pestaña Marketing del cliente y el asistente
// de IA. Quien llama ya verifico permisos sobre el cliente; aca se valida el
// contenido en si (incluida la regla de a quien se puede delegar).

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));

const optionalDate = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    if (!v || !v.trim()) return null;
    const iso = parseLocalDateTime(v);
    if (!iso) {
      ctx.addIssue({ code: "custom", message: "Fecha inválida." });
      return z.NEVER;
    }
    return iso;
  });

export const contentItemSchema = z.object({
  client_id: z.string().uuid({ message: "Elegí un cliente." }),
  title: z.string().trim().min(1, { message: "Poné un título." }).max(200),
  format: z.enum(CONTENT_FORMAT_VALUES, { message: "Elegí el tipo de contenido." }),
  channels: z
    .array(z.enum(SOCIAL_NETWORK_VALUES))
    .min(1, { message: "Elegí al menos una red social." })
    .transform((list) => Array.from(new Set(list))),
  recording_at: optionalDate,
  scheduled_at: optionalDate,
  script: optionalText(20000),
  copy: optionalText(10000),
  notes: optionalText(5000),
  attachment_url: optionalText(1000),
  assigned_to: z
    .string()
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .pipe(z.string().uuid().nullable()),
  status: z.enum(CONTENT_STATUS_ORDER as [ContentStatus, ...ContentStatus[]]).default("idea"),
});

export type ContentItemInput = z.input<typeof contentItemSchema>;
type ContentItemData = z.output<typeof contentItemSchema>;

export type SaveResult = { id: string; error?: undefined } | { error: string; id?: undefined };

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Datos inválidos.";
}

/** Devuelve un mensaje de error si `profileId` no es alguien de marketing activo. */
export async function checkAssignable(profileId: string | null): Promise<string | null> {
  if (!profileId) return null;
  const row = await queryOne<{ role: string }>("select role::text as role from profiles where id = $1", [profileId]);
  if (!row || !CONTENT_ASSIGNABLE_ROLES.includes(row.role as never)) {
    return "El contenido solo se puede delegar a alguien del equipo de marketing.";
  }
  return null;
}

export async function listMarketers(): Promise<{ id: string; full_name: string; role: string }[]> {
  return query(
    "select id, full_name, role::text as role from profiles where role = any($1::user_role[]) order by full_name",
    [CONTENT_ASSIGNABLE_ROLES]
  );
}

async function afterSave(
  actorId: string,
  item: ContentItemData & { id: string },
  previous: Pick<ContentItem, "assigned_to" | "status"> | null
) {
  if (item.assigned_to && item.assigned_to !== actorId && item.assigned_to !== previous?.assigned_to) {
    await notify(
      item.assigned_to,
      "content_assigned",
      "Te delegaron un contenido",
      item.title,
      `/calendar?item=${item.id}`
    );
  }
  if (item.status === "aprobacion_cliente" && previous?.status !== "aprobacion_cliente") {
    await notifyClientApproval(item.client_id, item.title);
  }
}

/** Avisa a los usuarios del portal del cliente que tienen una pieza para aprobar. */
export async function notifyClientApproval(clientId: string, title: string): Promise<void> {
  const users = await query<{ profile_id: string }>(
    "select profile_id from client_users where client_id = $1 and active = true",
    [clientId]
  );
  await notifyMany(
    users.map((u) => u.profile_id),
    "content_approval",
    "Tenés una pieza para aprobar",
    title,
    "/portal/content"
  );
}

export async function createContentItemRecord(actorId: string, input: ContentItemInput): Promise<SaveResult> {
  const parsed = contentItemSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const assignError = await checkAssignable(d.assigned_to);
  if (assignError) return { error: assignError };

  const row = await queryOne<{ id: string }>(
    `insert into content_items
       (client_id, channel, channels, format, title, copy, script, notes, attachment_url,
        recording_at, scheduled_at, assigned_to, status, created_by,
        published_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::public.content_status,$14,
        case when $13::public.content_status = 'publicado' then now() end)
     returning id`,
    [
      d.client_id, d.channels.join(", "), d.channels, d.format, d.title, d.copy, d.script, d.notes,
      d.attachment_url, d.recording_at, d.scheduled_at, d.assigned_to, d.status, actorId,
    ]
  );
  if (!row) return { error: "No se pudo guardar." };
  await afterSave(actorId, { ...d, id: row.id }, null);
  return { id: row.id };
}

/**
 * Edición parcial: lo que no viene en `patch` queda como estaba. Se valida
 * el resultado completo (no solo el patch), así nunca queda una pieza
 * inconsistente.
 */
export async function updateContentItemRecord(
  actorId: string,
  id: string,
  patch: Partial<ContentItemInput>
): Promise<SaveResult> {
  const current = await queryOne<ContentItem>("select * from content_items where id = $1", [id]);
  if (!current) return { error: "No existe esa pieza de contenido." };

  const toInput = (v: string | Date | null) => (v ? new Date(v).toISOString() : null);
  const merged: ContentItemInput = {
    client_id: current.client_id,
    title: current.title,
    format: current.format as ContentItemInput["format"],
    channels: (current.channels?.length ? current.channels : [current.channel]) as ContentItemInput["channels"],
    recording_at: toInput(current.recording_at),
    scheduled_at: toInput(current.scheduled_at),
    script: current.script,
    copy: current.copy,
    notes: current.notes,
    attachment_url: current.attachment_url,
    assigned_to: current.assigned_to,
    status: current.status,
    ...patch,
  };
  // El cliente de una pieza no se cambia por edición.
  merged.client_id = current.client_id;

  const parsed = contentItemSchema.safeParse(merged);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  if (d.assigned_to !== current.assigned_to) {
    const assignError = await checkAssignable(d.assigned_to);
    if (assignError) return { error: assignError };
  }

  await query(
    `update content_items set
       channel = $2, channels = $3, format = $4, title = $5, copy = $6, script = $7, notes = $8,
       attachment_url = $9, recording_at = $10, scheduled_at = $11, assigned_to = $12, status = $13::public.content_status,
       published_at = case when $13::public.content_status = 'publicado' then coalesce(published_at, now()) else published_at end,
       updated_at = now()
     where id = $1`,
    [
      id, d.channels.join(", "), d.channels, d.format, d.title, d.copy, d.script, d.notes,
      d.attachment_url, d.recording_at, d.scheduled_at, d.assigned_to, d.status,
    ]
  );
  await afterSave(actorId, { ...d, id }, current);
  return { id };
}
