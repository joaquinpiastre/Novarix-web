import "server-only";
import { getBoss, META_SYNC_JOB } from "./queue";
import { syncAllActiveConnections } from "@/lib/meta/sync";
import { queryOne } from "@/lib/db";
import { log } from "@/lib/log";

/** Se llama una vez al boot del server (ver instrumentation.ts). Registra el handler y la corrida diaria. */
export async function startMetaSyncJob(): Promise<void> {
  const boss = await getBoss();

  await boss.work(META_SYNC_JOB, async () => {
    log.info("meta sync: arrancando");
    await syncAllActiveConnections();
    log.info("meta sync: terminado");
  });

  // 6am hora Argentina, todos los dias. Si ya existe el schedule, pg-boss lo actualiza.
  await boss.schedule(META_SYNC_JOB, "0 6 * * *", {}, { tz: "America/Argentina/Mendoza" });

  // Puesta al dia: si alguna conexion no se sincroniza hace mas de un dia
  // (server caido a la hora del cron, o una conexion que quedo trabada), se
  // corre ahora. El singletonKey evita encolarla dos veces seguidas.
  const stale = await queryOne<{ n: number }>(
    `select count(*)::int as n from meta_connections mc join clients c on c.id = mc.client_id
     where c.status not in ('inactivo', 'eliminado')
       and (mc.last_synced_at is null or mc.last_synced_at < now() - interval '26 hours')`
  );
  if ((stale?.n ?? 0) > 0) {
    await boss.send(META_SYNC_JOB, {}, { singletonKey: "meta-sync-catchup", singletonSeconds: 3600 });
    log.info("meta sync: puesta al dia encolada", { conexiones: stale?.n });
  }

  log.info("meta sync job registrado");
}

export async function triggerMetaSyncNow(): Promise<void> {
  const boss = await getBoss();
  await boss.send(META_SYNC_JOB, {});
}
