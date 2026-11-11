import "server-only";
import { query } from "@/lib/db";
import { log } from "@/lib/log";
import { fetchYoutubeVideos } from "./providers/youtube";
import { upsertVideo } from "./store";

// Politicas de YouTube API Services (verificado 2026-11-11): las estadisticas
// de videos de terceros no se pueden guardar mas de 30 dias sin refrescar.
// - Videos de YouTube guardados en un tablero: se refrescan a los 25 dias.
// - Videos de YouTube que nadie guardo y no se vieron en 30 dias: se borran
//   (con sus resultados de busqueda y analisis).
// - Puntos del historial de metricas de YouTube de mas de 30 dias: se podan.

export async function enforceYoutubeRetention(): Promise<void> {
  const stale = await query<{ id: string; external_id: string }>(
    `select v.id, v.external_id from trend_videos v
     where v.platform = 'youtube' and v.source_provider <> 'mock'
       and v.last_seen_at < now() - interval '25 days'
       and exists (select 1 from swipe_items s where s.video_id = v.id)
     limit 500`
  );
  if (stale.length > 0 && process.env.YOUTUBE_API_KEY) {
    try {
      const fresh = await fetchYoutubeVideos(stale.map((s) => s.external_id), {});
      for (const v of fresh) await upsertVideo(v);
      const found = new Set(fresh.map((v) => v.externalId));
      const gone = stale.filter((s) => !found.has(s.external_id)).map((s) => s.id);
      if (gone.length) {
        // El video ya no existe o es privado: se borran las estadisticas, queda el link y nuestras notas.
        await query(
          `update trend_videos set views = null, likes = null, comments = null, author_followers = null,
             author_avg_views = null, metrics_history = '[]', last_seen_at = now()
           where id = any($1::uuid[])`,
          [gone]
        );
      }
    } catch (err) {
      log.error("youtube retention refresh failed", { err: String(err) });
    }
  }

  // Sin clave de API no se puede refrescar: se borran las estadisticas vencidas.
  await query(
    `update trend_videos set views = null, likes = null, comments = null, author_followers = null,
       author_avg_views = null, metrics_history = '[]'
     where platform = 'youtube' and last_seen_at < now() - interval '30 days'
       and exists (select 1 from swipe_items s where s.video_id = trend_videos.id)`
  );

  await query(
    `delete from trend_videos v
     where v.platform = 'youtube' and v.last_seen_at < now() - interval '30 days'
       and not exists (select 1 from swipe_items s where s.video_id = v.id)`
  );

  await query(
    `update trend_videos set metrics_history = coalesce((
       select jsonb_agg(x) from jsonb_array_elements(metrics_history) x
       where (x->>'at')::timestamptz > now() - interval '30 days'
     ), '[]'::jsonb)
     where platform = 'youtube' and jsonb_array_length(metrics_history) > 0`
  );
}
