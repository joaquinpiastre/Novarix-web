"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { requirePermission } from "@/lib/auth/requirePermission";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import type { ProjectStatus, TechAssetType, TicketPriority, TicketStatus } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

// ===== Proyectos =====

export async function createProject(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  await requirePermission("systems.manage");
  const { userId: actorId } = await requireClientAccess(client_id);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Completá el nombre del proyecto." };

  const description = String(formData.get("description") ?? "").trim() || null;
  const start_date = String(formData.get("start_date") ?? "") || null;
  const due_date = String(formData.get("due_date") ?? "") || null;
  const owner_id = String(formData.get("owner_id") ?? "") || null;

  await query(
    `insert into projects (client_id, name, description, start_date, due_date, owner_id, created_by)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [client_id, name, description, start_date, due_date, owner_id, actorId]
  );

  revalidatePath(`/clients/${client_id}`);
  return {};
}

export async function updateProjectStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const status = String(formData.get("status") ?? "") as ProjectStatus;
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!id || !status) return;

  await query("update projects set status = $1, updated_at = now() where id = $2", [status, id]);
  revalidatePath(`/clients/${client_id}`);
}

export async function deleteProject(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!id) return;
  await query("delete from projects where id = $1", [id]);
  revalidatePath(`/clients/${client_id}`);
}

// ===== Hitos =====

export async function addMilestone(formData: FormData): Promise<void> {
  const project_id = String(formData.get("project_id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const due_date = String(formData.get("due_date") ?? "") || null;
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!project_id || !title) return;

  await query("insert into project_milestones (project_id, title, due_date) values ($1,$2,$3)", [
    project_id,
    title,
    due_date,
  ]);
  revalidatePath(`/clients/${client_id}`);
}

export async function toggleMilestone(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const done = formData.get("done") === "true";
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!id) return;

  await query("update project_milestones set done = $1, done_at = case when $1 then now() else null end where id = $2", [
    done,
    id,
  ]);
  revalidatePath(`/clients/${client_id}`);
}

export async function deleteMilestone(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!id) return;
  await query("delete from project_milestones where id = $1", [id]);
  revalidatePath(`/clients/${client_id}`);
}

// ===== Tickets de soporte =====
// (createTicket/addTicketComment internos; el cliente los crea desde el
// portal via app/portal/support/actions.ts, no por acá.)

export async function createTicket(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  await requirePermission("systems.manage");
  const { userId: actorId } = await requireClientAccess(client_id);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Completá el título del ticket." };
  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TicketPriority;

  await query(
    `insert into support_tickets (client_id, title, description, priority, created_by)
     values ($1,$2,$3,$4,$5)`,
    [client_id, title, description, priority, actorId]
  );

  revalidatePath(`/clients/${client_id}`);
  return {};
}

export async function updateTicketStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const status = String(formData.get("status") ?? "") as TicketStatus;
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!id || !status) return;

  const resolving = status === "resolved" || status === "closed";
  await query(
    `update support_tickets set status = $1${resolving ? ", resolved_at = coalesce(resolved_at, now())" : ""} where id = $2`,
    [status, id]
  );
  revalidatePath(`/clients/${client_id}`);
}

// ===== Activos tecnicos =====

export async function createTechAsset(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  await requirePermission("systems.manage");
  const { userId: actorId } = await requireClientAccess(client_id);

  const asset_type = String(formData.get("asset_type") ?? "") as TechAssetType;
  const label = String(formData.get("label") ?? "").trim();
  if (!asset_type || !label) return { error: "Completá tipo y nombre del activo." };

  const provider = String(formData.get("provider") ?? "").trim() || null;
  const expires_at = String(formData.get("expires_at") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await query(
    `insert into tech_assets (client_id, asset_type, label, provider, expires_at, notes, created_by)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [client_id, asset_type, label, provider, expires_at, notes, actorId]
  );

  await recordAudit({
    actorId,
    action: "tech_assets.create",
    entityType: "tech_asset",
    after: { client_id, asset_type, label, expires_at },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
  return {};
}

export async function deleteTechAsset(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!id) return;
  await query("delete from tech_assets where id = $1", [id]);
  revalidatePath(`/clients/${client_id}`);
}

// ===== Bots GHL (metadata, sin integracion viva con la API) =====

export async function createGhlBot(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  await requirePermission("systems.manage");
  const { userId: actorId } = await requireClientAccess(client_id);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Completá el nombre del bot." };
  const ghl_location_id = String(formData.get("ghl_location_id") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await query(
    `insert into ghl_bots (client_id, name, ghl_location_id, notes, created_by) values ($1,$2,$3,$4,$5)`,
    [client_id, name, ghl_location_id, notes, actorId]
  );

  revalidatePath(`/clients/${client_id}`);
  return {};
}

export async function toggleGhlBotActive(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const active = formData.get("active") === "true";
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!id) return;
  await query("update ghl_bots set active = $1 where id = $2", [active, id]);
  revalidatePath(`/clients/${client_id}`);
}

export async function deleteGhlBot(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  await requirePermission("systems.manage");
  await requireClientAccess(client_id);
  if (!id) return;
  await query("delete from ghl_bots where id = $1", [id]);
  revalidatePath(`/clients/${client_id}`);
}
