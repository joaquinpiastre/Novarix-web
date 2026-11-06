"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import type { ClientStatus } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

function parseSocialLinks(raw: string): Record<string, string> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const links: Record<string, string> = {};
  for (const line of trimmed.split("\n")) {
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key && value) links[key.trim().toLowerCase()] = value;
  }
  return Object.keys(links).length > 0 ? links : null;
}

export interface CreateClientState extends ActionState {
  createdId?: string;
}

export async function createClient(
  _prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const { userId: actorId } = await requirePermission("clients.manage");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const legal_name = String(formData.get("legal_name") ?? "").trim() || null;
  const tax_id = String(formData.get("tax_id") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const primary_contact_name = String(formData.get("primary_contact_name") ?? "").trim() || null;
  const primary_contact_phone = String(formData.get("primary_contact_phone") ?? "").trim() || null;
  const primary_contact_email = String(formData.get("primary_contact_email") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "activo") as ClientStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const social_links = parseSocialLinks(String(formData.get("social_links") ?? ""));

  const [row] = await query<{ id: string }>(
    `insert into clients (
       name, legal_name, tax_id, industry, city, website, social_links,
       primary_contact_name, primary_contact_phone, primary_contact_email,
       status, notes, account_owner_id
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     returning id`,
    [
      name,
      legal_name,
      tax_id,
      industry,
      city,
      website,
      social_links ? JSON.stringify(social_links) : null,
      primary_contact_name,
      primary_contact_phone,
      primary_contact_email,
      status,
      notes,
      actorId,
    ]
  );

  await recordAudit({
    actorId,
    action: "clients.create",
    entityType: "client",
    entityId: row.id,
    after: { name, status },
    ip: getClientIp(),
  });

  revalidatePath("/clients");
  return { createdId: row.id };
}

export interface UpdateClientState extends ActionState {
  ok?: boolean;
}

export async function updateClient(
  _prevState: UpdateClientState,
  formData: FormData
): Promise<UpdateClientState> {
  const { userId: actorId } = await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Falta el nombre." };

  const legal_name = String(formData.get("legal_name") ?? "").trim() || null;
  const tax_id = String(formData.get("tax_id") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const primary_contact_name = String(formData.get("primary_contact_name") ?? "").trim() || null;
  const primary_contact_phone = String(formData.get("primary_contact_phone") ?? "").trim() || null;
  const primary_contact_email = String(formData.get("primary_contact_email") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "activo") as ClientStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const social_links = parseSocialLinks(String(formData.get("social_links") ?? ""));

  const before = await queryOne("select * from clients where id = $1", [id]);

  await query(
    `update clients set
       name=$1, legal_name=$2, tax_id=$3, industry=$4, city=$5, website=$6,
       social_links=$7, primary_contact_name=$8, primary_contact_phone=$9,
       primary_contact_email=$10, status=$11, notes=$12
     where id=$13`,
    [
      name,
      legal_name,
      tax_id,
      industry,
      city,
      website,
      social_links ? JSON.stringify(social_links) : null,
      primary_contact_name,
      primary_contact_phone,
      primary_contact_email,
      status,
      notes,
      id,
    ]
  );

  await recordAudit({
    actorId,
    action: "clients.update",
    entityType: "client",
    entityId: id,
    before,
    after: { name, status },
    ip: getClientIp(),
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}

export async function addClientService(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("client_services.manage");

  const client_id = String(formData.get("client_id") ?? "");
  const service_id = String(formData.get("service_id") ?? "");
  const feeRaw = String(formData.get("fee") ?? "").trim();
  const fee = feeRaw ? Number(feeRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!client_id || !service_id) return;

  const [row] = await query<{ id: string }>(
    `insert into client_services (client_id, service_id, fee, notes)
     values ($1, $2, $3, $4) returning id`,
    [client_id, service_id, fee, notes]
  );

  await recordAudit({
    actorId,
    action: "client_services.add",
    entityType: "client_service",
    entityId: row.id,
    after: { client_id, service_id, fee },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
}

export async function removeClientService(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("client_services.manage");

  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  if (!id) return;

  await query(
    "update client_services set status = 'ended', ended_at = current_date where id = $1",
    [id]
  );

  await recordAudit({
    actorId,
    action: "client_services.end",
    entityType: "client_service",
    entityId: id,
    ip: getClientIp(),
  });

  if (client_id) revalidatePath(`/clients/${client_id}`);
}

export async function addTeamMember(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("client_team.manage");

  const client_id = String(formData.get("client_id") ?? "");
  const profile_id = String(formData.get("profile_id") ?? "");
  const role_on_account = String(formData.get("role_on_account") ?? "colaborador").trim();
  if (!client_id || !profile_id) return;

  await query(
    `insert into client_team (client_id, profile_id, role_on_account)
     values ($1, $2, $3)
     on conflict (client_id, profile_id) do update set role_on_account = excluded.role_on_account`,
    [client_id, profile_id, role_on_account]
  );

  await recordAudit({
    actorId,
    action: "client_team.add",
    entityType: "client_team",
    entityId: client_id,
    after: { profile_id, role_on_account },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("client_team.manage");

  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  if (!id) return;

  await query("delete from client_team where id = $1", [id]);

  await recordAudit({
    actorId,
    action: "client_team.remove",
    entityType: "client_team",
    entityId: id,
    ip: getClientIp(),
  });

  if (client_id) revalidatePath(`/clients/${client_id}`);
}
