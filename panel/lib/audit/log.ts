import "server-only";
import { query } from "@/lib/db";
import { log } from "@/lib/log";

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

/**
 * Un fallo al registrar auditoría nunca debe interrumpir la operación real
 * (que un pago se registre importa más que el log) -- se traga el error acá
 * y queda constancia en los logs/Sentry.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, before_data, after_data, ip)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.actorId,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.before !== undefined ? JSON.stringify(entry.before) : null,
        entry.after !== undefined ? JSON.stringify(entry.after) : null,
        entry.ip ?? null,
      ]
    );
  } catch (err) {
    log.error("audit log insert failed", {
      err: String(err),
      action: entry.action,
      entityType: entry.entityType,
    });
  }
}
