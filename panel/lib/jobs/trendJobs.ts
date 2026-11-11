import "server-only";
import { getBoss, TREND_ALERTS_JOB, TREND_MAINTENANCE_JOB, TREND_SEARCH_JOB } from "./queue";
import { runDueSavedSearches, runSearchJob } from "@/lib/trends/pipeline";
import { enforceYoutubeRetention } from "@/lib/trends/maintenance";
import { notifyUpcomingCommercialDates } from "@/lib/ideas/commercialDatesJob";
import { log } from "@/lib/log";

interface SearchJobData {
  searchId: string;
}

/** Se llama una vez al boot del server (ver instrumentation.ts). */
export async function startTrendJobs(): Promise<void> {
  const boss = await getBoss();

  // Busquedas del Radar: de a 2 en paralelo (cada una ya paraleliza adentro).
  await boss.work<SearchJobData>(TREND_SEARCH_JOB, { batchSize: 2 }, async (jobs) => {
    for (const job of jobs) {
      await runSearchJob(job.data.searchId);
    }
  });

  await boss.work(TREND_ALERTS_JOB, async () => {
    log.info("trend alerts: arrancando");
    await runDueSavedSearches();
  });
  // Cada hora revisa que busquedas guardadas toca correr (cada una tiene su "cada X dias").
  await boss.schedule(TREND_ALERTS_JOB, "15 * * * *", {}, { tz: "America/Argentina/Mendoza" });

  await boss.work(TREND_MAINTENANCE_JOB, async () => {
    log.info("trend maintenance: arrancando");
    await enforceYoutubeRetention();
    await notifyUpcomingCommercialDates();
  });
  await boss.schedule(TREND_MAINTENANCE_JOB, "30 7 * * *", {}, { tz: "America/Argentina/Mendoza" });

  log.info("trend jobs registrados");
}

export async function enqueueTrendSearch(searchId: string): Promise<void> {
  const boss = await getBoss();
  // Una busqueda que se cuelga no puede bloquear la cola para siempre.
  await boss.send(TREND_SEARCH_JOB, { searchId } satisfies SearchJobData, { expireInSeconds: 20 * 60, retryLimit: 0 });
}
