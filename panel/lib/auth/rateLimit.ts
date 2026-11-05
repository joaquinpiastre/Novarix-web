import "server-only";
import { query } from "@/lib/db";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

/**
 * Guarda en Postgres, no en memoria: este repo redespliega seguido (watch
 * path panel/** en Railway), así que un contador en memoria se resetearía
 * solo con cada deploy, defeating the purpose.
 */
export async function recordLoginAttempt(identifier: string, success: boolean): Promise<void> {
  await query("insert into login_attempts (identifier, success) values ($1, $2)", [
    identifier,
    success,
  ]);

  // Limpieza oportunista, sin depender de un job: ~1% de las veces borra lo
  // viejo para que la tabla no crezca sin límite.
  if (Math.random() < 0.01) {
    await query("delete from login_attempts where created_at < now() - interval '7 days'");
  }
}

export async function isRateLimited(identifier: string): Promise<boolean> {
  const rows = await query<{ n: string }>(
    `select count(*)::text as n from login_attempts
     where identifier = $1 and success = false
       and created_at > now() - interval '${WINDOW_MINUTES} minutes'`,
    [identifier]
  );
  return Number(rows[0]?.n ?? 0) >= MAX_ATTEMPTS;
}
