"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { clientAccessError, requireScopedAccess, type TrendsAccess } from "@/lib/trends/access";
import { buildStorageKey, createPresignedUpload, deleteObject, headObjectSize } from "@/lib/storage/s3";
import { DEFAULT_MAX_UPLOAD_MB, resolveContentType, sanitizeFilename, sanitizeFolder } from "@/lib/library/files";

type Result<T = object> = ({ error?: undefined } & T) | { error: string };

const uuid = z.string().uuid();
const maxBytes = () => Number(process.env.CONTENT_MAX_UPLOAD_MB ?? DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024;

async function access(clientId: string): Promise<{ access: TrendsAccess; error: string | null }> {
  const a = await requireScopedAccess("library.use");
  if (!uuid.safeParse(clientId).success) return { access: a, error: "Elegí un cliente." };
  return { access: a, error: clientAccessError(a, clientId) };
}

interface FileRow {
  id: string;
  client_id: string;
  storage_key: string;
  filename: string;
  status: string;
  content_item_id: string | null;
  folder: string;
}

async function loadFile(id: string): Promise<{ file: FileRow | null; access: TrendsAccess | null; error: string | null }> {
  if (!uuid.safeParse(id).success) return { file: null, access: null, error: "Archivo inválido." };
  const file = await queryOne<FileRow>(
    "select id, client_id, storage_key, filename, status, content_item_id, folder from content_files where id = $1",
    [id]
  );
  if (!file) return { file: null, access: null, error: "No existe ese archivo." };
  const { access: a, error } = await access(file.client_id);
  return { file, access: a, error };
}

function revalidate() {
  revalidatePath("/marketing/biblioteca");
}

/** Paso 1: reserva el archivo y devuelve el POST firmado para subirlo directo al bucket. */
export async function startUpload(input: {
  client_id: string;
  folder: string;
  filename: string;
  content_type: string;
  size: number;
}): Promise<Result<{ id: string; url: string; fields: Record<string, string> }>> {
  const { access: a, error } = await access(input.client_id);
  if (error) return { error };
  const folder = sanitizeFolder(input.folder);
  if (folder == null) return { error: "Nombre de carpeta inválido (hasta 3 niveles, sin símbolos raros)." };
  const filename = sanitizeFilename(input.filename);
  const contentType = resolveContentType(filename, input.content_type);
  if (!contentType) return { error: `"${filename}": tipo de archivo no permitido. Subí fotos, videos, audio, PDF, ZIP o diseños.` };
  const size = Number(input.size);
  if (!Number.isFinite(size) || size <= 0) return { error: `"${filename}" está vacío.` };
  if (size > maxBytes()) return { error: `"${filename}" supera el máximo de ${Math.round(maxBytes() / 1024 / 1024)} MB por archivo.` };

  const key = buildStorageKey(`content/${input.client_id}`, filename);
  const row = await queryOne<{ id: string }>(
    `insert into content_files (client_id, folder, filename, content_type, size_bytes, storage_key, uploaded_by)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [input.client_id, folder, filename, contentType, size, key, a.userId]
  );
  try {
    const post = await createPresignedUpload(key, contentType, maxBytes());
    return { id: row!.id, url: post.url, fields: post.fields };
  } catch (err) {
    await query("delete from content_files where id = $1", [row!.id]);
    return { error: err instanceof Error && err.message.startsWith("Falta") ? err.message : "No se pudo preparar la subida." };
  }
}

/** Paso 2: el navegador avisa que termino; se verifica en el bucket que el archivo esté. */
export async function finishUpload(id: string): Promise<Result> {
  const { file, access: a, error } = await loadFile(id);
  if (error || !file || !a) return { error: error ?? "No existe ese archivo." };
  if (file.status === "ready") return {};
  const size = await headObjectSize(file.storage_key);
  if (!size) {
    await query("delete from content_files where id = $1", [id]);
    return { error: `No se encontró "${file.filename}" en el almacenamiento. Probá subirlo de nuevo.` };
  }
  await query("update content_files set status = 'ready', size_bytes = $2, updated_at = now() where id = $1", [id, size]);
  await recordAudit({ actorId: a.userId, action: "library.upload", entityType: "content_file", entityId: id, after: { client_id: file.client_id, filename: file.filename, folder: file.folder, size }, ip: getClientIp() });
  revalidate();
  return {};
}

export async function cancelUpload(id: string): Promise<Result> {
  const { file, error } = await loadFile(id);
  if (error || !file) return {};
  if (file.status !== "pending") return {};
  await deleteObject(file.storage_key).catch(() => undefined);
  await query("delete from content_files where id = $1", [id]);
  return {};
}

export async function deleteContentFile(id: string): Promise<Result> {
  const { file, access: a, error } = await loadFile(id);
  if (error || !file || !a) return { error: error ?? "No existe ese archivo." };
  await deleteObject(file.storage_key).catch(() => undefined);
  await query("delete from content_files where id = $1", [id]);
  // Si una pieza del calendario apuntaba a este archivo, se limpia el link.
  await query("update content_items set attachment_url = null where attachment_url = $1", [`/api/files/content-files/${id}`]);
  await recordAudit({ actorId: a.userId, action: "library.delete", entityType: "content_file", entityId: id, before: { filename: file.filename, folder: file.folder, client_id: file.client_id }, ip: getClientIp() });
  revalidate();
  return {};
}

export async function updateContentFile(id: string, input: { filename: string; folder: string; notes: string }): Promise<Result> {
  const { file, access: a, error } = await loadFile(id);
  if (error || !file || !a) return { error: error ?? "No existe ese archivo." };
  const folder = sanitizeFolder(input.folder);
  if (folder == null) return { error: "Nombre de carpeta inválido." };
  const filename = sanitizeFilename(input.filename);
  await query("update content_files set filename = $2, folder = $3, notes = $4, updated_at = now() where id = $1", [
    id,
    filename,
    folder,
    input.notes.trim().slice(0, 2000) || null,
  ]);
  await recordAudit({ actorId: a.userId, action: "library.update", entityType: "content_file", entityId: id, before: { filename: file.filename, folder: file.folder }, after: { filename, folder }, ip: getClientIp() });
  revalidate();
  return {};
}

/** Vincula el archivo a una pieza del calendario (o lo desvincula con null). */
export async function linkContentFile(id: string, contentItemId: string | null): Promise<Result> {
  const { file, access: a, error } = await loadFile(id);
  if (error || !file || !a) return { error: error ?? "No existe ese archivo." };
  const fileUrl = `/api/files/content-files/${id}`;
  if (contentItemId) {
    if (!uuid.safeParse(contentItemId).success) return { error: "Pieza inválida." };
    const item = await queryOne<{ client_id: string; attachment_url: string | null }>(
      "select client_id, attachment_url from content_items where id = $1",
      [contentItemId]
    );
    if (!item || item.client_id !== file.client_id) return { error: "Esa pieza no es de este cliente." };
    await query("update content_files set content_item_id = $2, updated_at = now() where id = $1", [id, contentItemId]);
    // Si la pieza no tenia archivo, este pasa a ser el principal (lo ven el calendario y el portal).
    if (!item.attachment_url) {
      await query("update content_items set attachment_url = $2, updated_at = now() where id = $1", [contentItemId, fileUrl]);
    }
  } else {
    await query("update content_files set content_item_id = null, updated_at = now() where id = $1", [id]);
    await query("update content_items set attachment_url = null where attachment_url = $1", [fileUrl]);
  }
  await recordAudit({ actorId: a.userId, action: "library.link", entityType: "content_file", entityId: id, after: { content_item_id: contentItemId }, ip: getClientIp() });
  revalidate();
  revalidatePath("/calendar");
  return {};
}
