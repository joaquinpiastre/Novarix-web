import "server-only";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { query, queryOne } from "@/lib/db";
import { can, type Permission } from "@/lib/auth/permissions";
import { canAccessTicket } from "@/lib/tickets/authorize";
import { recordAudit } from "@/lib/audit/log";
import { log } from "@/lib/log";
import { notify } from "@/lib/notifications/create";
import { createContentItemRecord, updateContentItemRecord } from "@/lib/marketing/contentItems";
import { CONTENT_FORMAT_VALUES, SOCIAL_NETWORK_VALUES } from "@/lib/marketing/content";
import { parseLocalDateTime } from "@/lib/utils/dates";
import { CONTENT_STATUS_ORDER, type Profile } from "@/lib/types/domain";
import { assignTicket, updateTicketPriority, updateTicketStatus } from "@/app/(app)/tickets/actions";

// Herramientas del asistente. Son la UNICA forma que tiene la IA de tocar el
// sistema: leen y escriben datos (tablas) con las mismas reglas de permisos
// que la persona que la está usando, nunca más. No hay herramientas para
// borrar registros ni para tocar código, configuración, usuarios o pagos.
// Cada escritura queda en audit_log como "ai.<herramienta>".

export interface ToolContext {
  userId: string;
  profile: Profile;
  ip: string | null;
}

interface AiTool<S extends z.ZodObject = z.ZodObject> {
  name: string;
  description: string;
  schema: S;
  permission?: Permission;
  write: boolean;
  run: (ctx: ToolContext, input: z.output<S>) => Promise<unknown>;
}

function tool<S extends z.ZodObject>(def: AiTool<S>): AiTool<S> {
  return def;
}

class ToolError extends Error {}

const uuid = z.string().uuid();
const optionalUuid = uuid.optional();
const dateTime = z
  .string()
  .describe("Fecha y hora en hora de Mendoza, formato yyyy-MM-ddTHH:mm (o solo yyyy-MM-dd)");
const statusEnum = z.enum(CONTENT_STATUS_ORDER as [string, ...string[]]);
const clientStatus = z.enum(["prospecto", "activo", "pausado", "baja"]);
const ticketStatus = z.enum(["nuevo", "en_revision", "en_curso", "esperando_cliente", "resuelto", "cerrado"]);

function toFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const TOOLS = [
  // ===================== LECTURA =====================
  tool({
    name: "buscar_clientes",
    description: "Busca clientes por nombre, rubro o estado. Devuelve id, nombre, estado, rubro y responsable de cuenta.",
    write: false,
    permission: "clients.manage",
    schema: z.object({
      texto: z.string().optional().describe("Parte del nombre, razón social o rubro"),
      estado: clientStatus.optional(),
    }),
    run: async (_ctx, i) =>
      query(
        `select c.id, c.name, c.legal_name, c.status, c.industry, c.city, p.full_name as responsable
         from clients c left join profiles p on p.id = c.account_owner_id
         where ($1::text is null or c.name ilike '%'||$1||'%' or c.legal_name ilike '%'||$1||'%' or c.industry ilike '%'||$1||'%')
           and ($2::client_status is null or c.status = $2)
         order by c.name limit 50`,
        [i.texto ?? null, i.estado ?? null]
      ),
  }),

  tool({
    name: "ver_cliente",
    description:
      "Ficha completa de un cliente: datos, servicios contratados, equipo asignado, plan de marketing vigente, " +
      "contenido por estado, tickets abiertos, inversión en Meta de los últimos 30 días y alertas. " +
      "Si la persona tiene acceso a cobros, incluye abonos y últimos pagos.",
    write: false,
    permission: "clients.manage",
    schema: z.object({ client_id: uuid }),
    run: async (ctx, { client_id }) => {
      const client = await queryOne(
        `select id, name, legal_name, tax_id, industry, city, website, status, primary_contact_name,
                primary_contact_phone, primary_contact_email, account_owner_id, created_at
         from clients where id = $1`,
        [client_id]
      );
      if (!client) throw new ToolError("No existe ese cliente.");
      const [services, team, plan, content, tickets, meta, alerts] = await Promise.all([
        query(
          `select sc.name, sc.category, cs.status, cs.fee, cs.started_at from client_services cs
           join services_catalog sc on sc.id = cs.service_id where cs.client_id = $1`,
          [client_id]
        ),
        query(
          `select p.id, p.full_name, p.role from client_team ct join profiles p on p.id = ct.profile_id where ct.client_id = $1`,
          [client_id]
        ),
        queryOne(
          `select id, status, period_start, period_end, objectives, deliverables, budget_ads from marketing_plans
           where client_id = $1 order by status = 'active' desc, period_start desc limit 1`,
          [client_id]
        ),
        query(`select status, count(*)::int as cantidad from content_items where client_id = $1 group by status`, [client_id]),
        query(
          `select id, number, title, status, priority, created_at from support_tickets
           where client_id = $1 and status not in ('resuelto','cerrado') order by created_at desc`,
          [client_id]
        ),
        queryOne(
          `select coalesce(sum(spend),0)::float as gasto, coalesce(sum(impressions),0)::int as impresiones,
                  coalesce(sum(clicks),0)::int as clics,
                  coalesce(sum(leads)+sum(purchases)+sum(messaging_conversations),0)::int as resultados
           from meta_insights_daily where client_id = $1 and date >= current_date - 30`,
          [client_id]
        ),
        query(`select severity, kind, message, created_at from alerts where client_id = $1 and resolved = false`, [client_id]),
      ]);
      const finance = can(ctx.profile, "payments_in.manage")
        ? {
            abonos: await query(
              "select amount, billing_day, concept, active from recurring_agreements where client_id = $1",
              [client_id]
            ),
            ultimos_pagos: await query(
              `select amount, concept, date_received, period_month from payments_in where client_id = $1
               order by coalesce(date_received, created_at) desc limit 6`,
              [client_id]
            ),
          }
        : undefined;
      return { client, services, team, plan, content, open_tickets: tickets, meta_30_dias: meta, alerts, finance };
    },
  }),

  tool({
    name: "listar_equipo",
    description: "Lista las personas del equipo interno (id, nombre y rol). Usalo para saber a quién asignar algo.",
    write: false,
    schema: z.object({}),
    run: async () =>
      query("select id, full_name, role::text as role from profiles where role != 'client' order by full_name"),
  }),

  tool({
    name: "listar_contenido",
    description:
      "Lista piezas de contenido con filtros. Las fechas se filtran por fecha de grabación (o de publicación si se pide). " +
      "Incluye guion, copy y notas.",
    write: false,
    permission: "marketing.view_all",
    schema: z.object({
      client_id: optionalUuid,
      asignado_a: optionalUuid,
      estado: statusEnum.optional(),
      desde: dateTime.optional(),
      hasta: dateTime.optional(),
      por_fecha: z.enum(["grabacion", "publicacion"]).optional().describe("Qué fecha usar para desde/hasta (default: grabación)"),
      sin_fecha_grabacion: z.boolean().optional(),
      limite: z.number().int().min(1).max(100).optional(),
    }),
    run: async (_ctx, i) => {
      const col = i.por_fecha === "publicacion" ? "ci.scheduled_at" : "ci.recording_at";
      return query(
        `select ci.id, ci.title, ci.format, ci.channels, ci.status, ci.recording_at, ci.scheduled_at,
                ci.script, ci.copy, ci.notes, ci.attachment_url, c.name as cliente, ci.client_id,
                p.full_name as responsable, ci.assigned_to
         from content_items ci join clients c on c.id = ci.client_id left join profiles p on p.id = ci.assigned_to
         where ($1::uuid is null or ci.client_id = $1)
           and ($2::uuid is null or ci.assigned_to = $2)
           and ($3::content_status is null or ci.status = $3)
           and ($4::timestamptz is null or ${col} >= $4)
           and ($5::timestamptz is null or ${col} < $5)
           and (not $6 or ci.recording_at is null)
         order by coalesce(${col}, ci.created_at) limit $7`,
        [
          i.client_id ?? null,
          i.asignado_a ?? null,
          i.estado ?? null,
          parseLocalDateTime(i.desde),
          parseLocalDateTime(i.hasta),
          i.sin_fecha_grabacion ?? false,
          i.limite ?? 50,
        ]
      );
    },
  }),

  tool({
    name: "listar_tareas",
    description: "Lista tareas internas. Sin permiso de gestión de tareas solo ve las propias.",
    write: false,
    schema: z.object({
      asignado_a: optionalUuid,
      estado: z.enum(["pending", "in_progress", "done"]).optional(),
    }),
    run: async (ctx, i) => {
      const own = !can(ctx.profile, "tasks.manage");
      return query(
        `select t.id, t.title, t.description, t.status, t.due_date, p.full_name as responsable, t.assigned_to
         from tasks t left join profiles p on p.id = t.assigned_to
         where ($1::uuid is null or t.assigned_to = $1) and ($2::task_status is null or t.status = $2)
         order by t.status = 'done', t.due_date nulls last limit 100`,
        [own ? ctx.userId : i.asignado_a ?? null, i.estado ?? null]
      );
    },
  }),

  tool({
    name: "listar_tickets",
    description: "Lista tickets de soporte de clientes, por cliente o estado.",
    write: false,
    permission: "tickets.manage_all",
    schema: z.object({ client_id: optionalUuid, estado: ticketStatus.optional() }),
    run: async (_ctx, i) =>
      query(
        `select t.id, t.number, t.title, t.status, t.priority, t.ticket_type, t.sla_due_at, t.created_at,
                c.name as cliente, p.full_name as asignado
         from support_tickets t join clients c on c.id = t.client_id left join profiles p on p.id = t.assigned_to
         where ($1::uuid is null or t.client_id = $1) and ($2::text is null or t.status::text = $2)
         order by t.created_at desc limit 50`,
        [i.client_id ?? null, i.estado ?? null]
      ),
  }),

  tool({
    name: "metricas_meta",
    description: "Métricas de Meta Ads (gasto, impresiones, clics, resultados) de un cliente, por día y totales.",
    write: false,
    permission: "marketing.view_all",
    schema: z.object({ client_id: uuid, dias: z.number().int().min(1).max(365).optional() }),
    run: async (_ctx, i) => {
      const dias = i.dias ?? 30;
      const daily = await query(
        `select date, sum(spend)::float as gasto, sum(impressions)::int as impresiones, sum(clicks)::int as clics,
                (sum(leads)+sum(purchases)+sum(messaging_conversations))::int as resultados
         from meta_insights_daily where client_id = $1 and date >= current_date - $2::int
         group by date order by date`,
        [i.client_id, dias]
      );
      const campaigns = await query(
        `select campaign_name, sum(spend)::float as gasto,
                (sum(leads)+sum(purchases)+sum(messaging_conversations))::int as resultados
         from meta_insights_daily where client_id = $1 and date >= current_date - $2::int
         group by campaign_name order by gasto desc limit 15`,
        [i.client_id, dias]
      );
      return { dias, daily, campaigns };
    },
  }),

  tool({
    name: "ver_finanzas",
    description: "Resumen financiero de un mes: cobrado, pendiente de cobro y pagos al equipo. Solo administradores.",
    write: false,
    permission: "payments_in.manage",
    schema: z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("yyyy-MM, default mes actual") }),
    run: async (_ctx, i) => {
      const month = `${i.mes ?? new Date().toISOString().slice(0, 7)}-01`;
      const [cobros, pagos, porCliente] = await Promise.all([
        queryOne(
          `select coalesce(sum(amount) filter (where date_received is not null),0)::float as cobrado,
                  coalesce(sum(amount) filter (where date_received is null),0)::float as pendiente
           from payments_in where period_month = $1::date`,
          [month]
        ),
        queryOne(
          `select coalesce(sum(amount),0)::float as total from payments_out where period_month = $1::date`,
          [month]
        ),
        query(
          `select c.name, sum(pi.amount)::float as cobrado from payments_in pi join clients c on c.id = pi.client_id
           where pi.period_month = $1::date and pi.date_received is not null group by c.name order by cobrado desc`,
          [month]
        ),
      ]);
      return { mes: month, cobros, pagos_equipo: pagos, por_cliente: porCliente };
    },
  }),

  // ===================== ESCRITURA =====================
  tool({
    name: "crear_contenido",
    description:
      "Crea una pieza de contenido en el calendario. El responsable solo puede ser alguien de marketing " +
      "(rol marketing o marketing_admin).",
    write: true,
    permission: "marketing.view_all",
    schema: z.object({
      client_id: uuid,
      title: z.string().min(1),
      format: z.enum(CONTENT_FORMAT_VALUES),
      channels: z.array(z.enum(SOCIAL_NETWORK_VALUES)).min(1),
      recording_at: dateTime.optional(),
      scheduled_at: dateTime.optional().describe("Fecha de publicación"),
      script: z.string().optional().describe("Guion"),
      copy: z.string().optional(),
      notes: z.string().optional().describe("Notas especiales"),
      assigned_to: optionalUuid,
      status: statusEnum.optional(),
    }),
    run: async (ctx, i) => {
      const result = await createContentItemRecord(ctx.userId, i as never);
      if (result.error) throw new ToolError(result.error);
      return { ok: true, id: result.id, link: `/calendar?item=${result.id}` };
    },
  }),

  tool({
    name: "actualizar_contenido",
    description: "Modifica una pieza de contenido existente. Solo se cambian los campos que mandes.",
    write: true,
    permission: "marketing.view_all",
    schema: z.object({
      id: uuid,
      title: z.string().min(1).optional(),
      format: z.enum(CONTENT_FORMAT_VALUES).optional(),
      channels: z.array(z.enum(SOCIAL_NETWORK_VALUES)).min(1).optional(),
      recording_at: dateTime.nullable().optional(),
      scheduled_at: dateTime.nullable().optional(),
      script: z.string().nullable().optional(),
      copy: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      assigned_to: uuid.nullable().optional(),
      status: statusEnum.optional(),
    }),
    run: async (ctx, { id, ...patch }) => {
      const result = await updateContentItemRecord(ctx.userId, id, patch as never);
      if (result.error) throw new ToolError(result.error);
      return { ok: true, id, link: `/calendar?item=${id}` };
    },
  }),

  tool({
    name: "crear_tarea",
    description: "Crea una tarea interna y se la asigna a alguien del equipo (le llega una notificación).",
    write: true,
    permission: "tasks.manage",
    schema: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      assigned_to: optionalUuid,
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
    run: async (ctx, i) => {
      const row = await queryOne<{ id: string }>(
        `insert into tasks (title, description, assigned_to, due_date, created_by) values ($1,$2,$3,$4,$5) returning id`,
        [i.title, i.description ?? null, i.assigned_to ?? null, i.due_date ?? null, ctx.userId]
      );
      if (i.assigned_to && i.assigned_to !== ctx.userId) {
        await notify(i.assigned_to, "task_assigned", "Tenés una tarea nueva", i.title, "/tasks");
      }
      return { ok: true, id: row?.id };
    },
  }),

  tool({
    name: "actualizar_tarea",
    description: "Cambia estado, responsable, fecha límite o título de una tarea.",
    write: true,
    permission: "tasks.manage",
    schema: z.object({
      id: uuid,
      title: z.string().min(1).optional(),
      status: z.enum(["pending", "in_progress", "done"]).optional(),
      assigned_to: uuid.nullable().optional(),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    }),
    run: async (_ctx, i) => {
      const row = await queryOne<{ id: string }>(
        `update tasks set
           title = coalesce($2, title),
           status = coalesce($3::task_status, status),
           assigned_to = case when $4 then $5::uuid else assigned_to end,
           due_date = case when $6 then $7::date else due_date end,
           updated_at = now()
         where id = $1 returning id`,
        [
          i.id, i.title ?? null, i.status ?? null,
          i.assigned_to !== undefined, i.assigned_to ?? null,
          i.due_date !== undefined, i.due_date ?? null,
        ]
      );
      if (!row) throw new ToolError("No existe esa tarea.");
      return { ok: true };
    },
  }),

  tool({
    name: "actualizar_cliente",
    description: "Actualiza datos de un cliente (estado, rubro, ciudad, web, contacto principal, responsable de cuenta).",
    write: true,
    permission: "clients.manage",
    schema: z.object({
      client_id: uuid,
      status: clientStatus.optional(),
      industry: z.string().optional(),
      city: z.string().optional(),
      website: z.string().optional(),
      primary_contact_name: z.string().optional(),
      primary_contact_phone: z.string().optional(),
      primary_contact_email: z.string().email().optional(),
      account_owner_id: optionalUuid,
    }),
    run: async (_ctx, { client_id, ...fields }) => {
      const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
      if (entries.length === 0) throw new ToolError("No mandaste ningún campo para cambiar.");
      const sets = entries.map(([k], idx) => `${k} = $${idx + 2}${k === "status" ? "::client_status" : ""}`);
      const row = await queryOne<{ id: string }>(
        `update clients set ${sets.join(", ")} where id = $1 returning id`,
        [client_id, ...entries.map(([, v]) => v)]
      );
      if (!row) throw new ToolError("No existe ese cliente.");
      return { ok: true };
    },
  }),

  tool({
    name: "crear_campana",
    description: "Registra una campaña publicitaria para un cliente.",
    write: true,
    permission: "marketing.view_all",
    schema: z.object({
      client_id: uuid,
      name: z.string().min(1),
      channel: z.enum(["meta", "google", "tiktok", "other"]),
      objective: z.string().optional(),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      budget: z.number().nonnegative().optional().describe("Presupuesto en ARS"),
    }),
    run: async (ctx, i) => {
      const row = await queryOne<{ id: string }>(
        `insert into campaigns (client_id, name, channel, objective, start_date, end_date, budget, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [i.client_id, i.name, i.channel, i.objective ?? null, i.start_date ?? null, i.end_date ?? null, i.budget ?? null, ctx.userId]
      );
      return { ok: true, id: row?.id };
    },
  }),

  tool({
    name: "actualizar_ticket",
    description:
      "Cambia estado, prioridad o asignación de un ticket de soporte. El cliente recibe aviso del cambio de estado.",
    write: true,
    permission: "tickets.manage_all",
    schema: z.object({
      ticket_id: uuid,
      status: ticketStatus.optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assigned_to: uuid.nullable().optional(),
    }),
    run: async (ctx, i) => {
      const ticket = await queryOne<{ client_id: string; assigned_to: string | null }>(
        "select client_id, assigned_to from support_tickets where id = $1",
        [i.ticket_id]
      );
      if (!ticket || !(await canAccessTicket(ctx.profile, ctx.userId, ticket.client_id, ticket.assigned_to))) {
        throw new ToolError("No existe ese ticket o no tenés acceso.");
      }
      // Mismas acciones que usa la pantalla de tickets: eventos, avisos y auditoría incluidos.
      if (i.status) await updateTicketStatus(toFormData({ ticket_id: i.ticket_id, status: i.status }));
      if (i.priority) await updateTicketPriority(toFormData({ ticket_id: i.ticket_id, priority: i.priority }));
      if (i.assigned_to !== undefined) {
        await assignTicket(toFormData({ ticket_id: i.ticket_id, assigned_to: i.assigned_to ?? "" }));
      }
      return { ok: true };
    },
  }),

  tool({
    name: "crear_recordatorio",
    description: "Crea un recordatorio personal para la persona que está usando el asistente.",
    write: true,
    permission: "reminders.manage",
    schema: z.object({ title: z.string().min(1), remind_at: dateTime }),
    run: async (ctx, i) => {
      const at = parseLocalDateTime(i.remind_at);
      if (!at) throw new ToolError("Fecha inválida.");
      const row = await queryOne<{ id: string }>(
        "insert into reminders (owner_id, title, remind_at) values ($1,$2,$3) returning id",
        [ctx.userId, i.title, at]
      );
      return { ok: true, id: row?.id };
    },
  }),
];

export const WRITE_TOOLS = new Set(TOOLS.filter((t) => t.write).map((t) => t.name));

function availableTools(profile: Profile) {
  return TOOLS.filter((t) => !t.permission || can(profile, t.permission));
}

function jsonSchemaFor(schema: z.ZodObject): Anthropic.Tool.InputSchema {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  return rest as Anthropic.Tool.InputSchema;
}

/** Definiciones para la API, filtradas por lo que la persona puede hacer. Orden estable (cache). */
export function toolDefinitionsFor(profile: Profile): Anthropic.Tool[] {
  return availableTools(profile).map((t) => ({
    name: t.name,
    description: `${t.write ? "[MODIFICA DATOS] " : ""}${t.description}`,
    input_schema: jsonSchemaFor(t.schema),
  }));
}

export interface ToolOutcome {
  content: string;
  isError: boolean;
  write: boolean;
}

/** Ejecuta una herramienta pedida por el modelo, revalidando permisos e input. */
export async function runTool(ctx: ToolContext, name: string, rawInput: unknown): Promise<ToolOutcome> {
  const def = TOOLS.find((t) => t.name === name);
  if (!def) return { content: `No existe la herramienta ${name}.`, isError: true, write: false };
  if (def.permission && !can(ctx.profile, def.permission)) {
    return { content: "No tenés permiso para esta acción.", isError: true, write: false };
  }
  const parsed = def.schema.safeParse(rawInput);
  if (!parsed.success) {
    return { content: `Datos inválidos: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, isError: true, write: false };
  }
  try {
    const result = await (def.run as AiTool["run"])(ctx, parsed.data);
    if (def.write) {
      await recordAudit({ actorId: ctx.userId, action: `ai.${def.name}`, entityType: "ai_tool", after: parsed.data, ip: ctx.ip });
    }
    return { content: JSON.stringify(result ?? { ok: true }), isError: false, write: def.write };
  } catch (err) {
    if (!(err instanceof ToolError)) log.error("ai tool failed", { tool: name, err: String(err) });
    const message = err instanceof ToolError ? err.message : "Error interno al ejecutar la acción.";
    return { content: message, isError: true, write: def.write };
  }
}

/** Para mostrar en el chat qué hizo la IA. */
export const TOOL_LABELS: Record<string, string> = {
  buscar_clientes: "Buscó clientes",
  ver_cliente: "Revisó la ficha del cliente",
  listar_equipo: "Revisó el equipo",
  listar_contenido: "Revisó el contenido",
  listar_tareas: "Revisó las tareas",
  listar_tickets: "Revisó los tickets",
  metricas_meta: "Revisó métricas de Meta",
  ver_finanzas: "Revisó finanzas",
  crear_contenido: "Creó contenido",
  actualizar_contenido: "Modificó contenido",
  crear_tarea: "Creó una tarea",
  actualizar_tarea: "Modificó una tarea",
  actualizar_cliente: "Modificó un cliente",
  crear_campana: "Creó una campaña",
  actualizar_ticket: "Modificó un ticket",
  crear_recordatorio: "Creó un recordatorio",
};
