import "server-only";
import PgBoss from "pg-boss";
import { log } from "@/lib/log";

declare global {
  // eslint-disable-next-line no-var
  var __pgBoss: PgBoss | undefined;
}

export const META_SYNC_JOB = "meta-sync-daily";

let starting: Promise<PgBoss> | null = null;

/**
 * pg-boss corre adentro del mismo proceso del server de Next (arrancado
 * desde instrumentation.ts), sin un segundo servicio en Railway. Usa su
 * propio esquema en el mismo Postgres (lo crea solo en el primer start()).
 */
export async function getBoss(): Promise<PgBoss> {
  if (global.__pgBoss) return global.__pgBoss;
  if (starting) return starting;

  starting = (async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Falta DATABASE_URL para pg-boss.");

    const boss = new PgBoss({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    boss.on("error", (err) => log.error("pg-boss error", { err: String(err) }));
    await boss.start();
    // pg-boss v10 exige crear la cola explicitamente antes de send()/work()/schedule().
    await boss.createQueue(META_SYNC_JOB);
    global.__pgBoss = boss;
    log.info("pg-boss iniciado");
    return boss;
  })();

  return starting;
}
