"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireClient, assertNotPreview } from "@/lib/auth/requireClient";
import { validateUpload } from "@/lib/storage/uploadLimits";
import { buildStorageKey, uploadObject } from "@/lib/storage/s3";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { notifyMany } from "@/lib/notifications/create";

export interface ActionState {
  error?: string;
}

export async function uploadClientFile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const access = await requireClient();
  const previewError = assertNotPreview(access);
  if (previewError) return previewError;
  const { userId: actorId, clientId } = access;

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Elegí un archivo." };

  const validation = validateUpload(file);
  if (validation.error) return validation;

  const key = buildStorageKey(`client-files/${clientId}`, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject(key, buffer, file.type);

  await query(
    `insert into client_files (client_id, uploaded_by, direction, storage_key, filename, content_type, size_bytes)
     values ($1,$2,'from_client',$3,$4,$5,$6)`,
    [clientId, actorId, key, file.name, file.type, file.size]
  );

  const team = await query<{ profile_id: string }>(
    "select profile_id from client_team where client_id = $1",
    [clientId]
  );
  await notifyMany(
    team.map((t) => t.profile_id),
    "client_file_uploaded",
    "El cliente subió un archivo",
    file.name,
    `/clients/${clientId}`
  );

  await recordAudit({
    actorId,
    action: "client_files.upload_by_client",
    entityType: "client_file",
    after: { filename: file.name },
    ip: getClientIp(),
  });

  revalidatePath("/portal/files");
  return {};
}
