import "server-only";
import { getBoss, META_SYNC_JOB } from "./queue";
import { syncAllActiveConnections } from "@/lib/meta/sync";
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

  log.info("meta sync job registrado");
}

export async function triggerMetaSyncNow(): Promise<void> {
  const boss = await getBoss();
  await boss.send(META_SYNC_JOB, {});
}
