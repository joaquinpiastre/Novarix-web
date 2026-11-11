import "server-only";
import { query } from "@/lib/db";
import { log } from "@/lib/log";
import { deleteObject } from "@/lib/storage/s3";

/** Subidas que nunca se confirmaron (se cerró la pestaña, se cortó internet): se borran a las 24 h. */
export async function cleanupPendingUploads(): Promise<void> {
  const stale = await query<{ id: string; storage_key: string }>(
    "select id, storage_key from content_files where status = 'pending' and created_at < now() - interval '24 hours' limit 500"
  );
  for (const f of stale) {
    await deleteObject(f.storage_key).catch(() => undefined);
    await query("delete from content_files where id = $1", [f.id]);
  }
  if (stale.length) log.info("biblioteca: subidas incompletas limpiadas", { count: stale.length });
}
