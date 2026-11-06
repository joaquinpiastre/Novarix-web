"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { validateUpload } from "@/lib/storage/uploadLimits";
import { buildStorageKey, deleteObject, uploadObject } from "@/lib/storage/s3";
import { notifyMany } from "@/lib/notifications/create";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

async function notifyPortalUsers(clientId: string, kind: string, title: string, body: string, link: string) {
  const users = await query<{ profile_id: string }>(
    "select profile_id from client_users where client_id = $1 and active = true",
    [clientId]
  );
  await notifyMany(users.map((u) => u.profile_id), kind, title, body, link);
}

const reportSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().trim().min(1),
  period_month: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal("")),
});

export async function publishReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reportSchema.safeParse({
    client_id: formData.get("client_id"),
    title: formData.get("title"),
    period_month: formData.get("period_month") || "",
  });
  if (!parsed.success) return { error: "Completá el título del reporte." };
  const { client_id, title, period_month } = parsed.data;
  const { userId: actorId } = await requireClientAccess(client_id);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí el PDF del reporte." };
  if (file.type !== "application/pdf") return { error: "El reporte tiene que ser un PDF." };
  const validation = validateUpload(file);
  if (validation.error) return validation;

  const key = buildStorageKey(`reports/${client_id}`, file.name);
  await uploadObject(key, Buffer.from(await file.arrayBuffer()), file.type);

  const [row] = await query<{ id: string }>(
    `insert into client_reports (client_id, title, period_month, storage_key, filename, published_by)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [client_id, title, period_month ? `${period_month}-01` : null, key, file.name, actorId]
  );

  await notifyPortalUsers(client_id, "report_published", "Nuevo reporte disponible", title, "/portal/reports");
  await recordAudit({ actorId, action: "client_reports.publish", entityType: "client_report", entityId: row.id, ip: getClientIp() });

  revalidatePath(`/clients/${client_id}`);
  return { ok: true };
}

export async function shareFile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  if (!z.string().uuid().safeParse(client_id).success) return { error: "Cliente inválido." };
  const { userId: actorId } = await requireClientAccess(client_id);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí un archivo." };
  const validation = validateUpload(file);
  if (validation.error) return validation;

  const key = buildStorageKey(`client-files/${client_id}`, file.name);
  await uploadObject(key, Buffer.from(await file.arrayBuffer()), file.type);
  await query(
    `insert into client_files (client_id, uploaded_by, direction, storage_key, filename, content_type, size_bytes)
     values ($1,$2,'from_novarix',$3,$4,$5,$6)`,
    [client_id, actorId, key, file.name, file.type, file.size]
  );

  await notifyPortalUsers(client_id, "file_shared", "Novarix compartió un archivo", file.name, "/portal/files");
  await recordAudit({ actorId, action: "client_files.share", entityType: "client", entityId: client_id, after: { filename: file.name }, ip: getClientIp() });

  revalidatePath(`/clients/${client_id}`);
  return { ok: true };
}

export async function deleteReport(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const { userId: actorId } = await requireClientAccess(client_id);
  const row = await queryOne<{ storage_key: string }>(
    "delete from client_reports where id = $1 and client_id = $2 returning storage_key",
    [id, client_id]
  );
  if (row) await deleteObject(row.storage_key);
  await recordAudit({ actorId, action: "client_reports.delete", entityType: "client_report", entityId: id, ip: getClientIp() });
  revalidatePath(`/clients/${client_id}`);
}

export async function deleteClientFile(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const { userId: actorId } = await requireClientAccess(client_id);
  const row = await queryOne<{ storage_key: string }>(
    "delete from client_files where id = $1 and client_id = $2 returning storage_key",
    [id, client_id]
  );
  if (row) await deleteObject(row.storage_key);
  await recordAudit({ actorId, action: "client_files.delete", entityType: "client_file", entityId: id, ip: getClientIp() });
  revalidatePath(`/clients/${client_id}`);
}
