import "server-only";
import { createHash } from "crypto";
import { query, queryOne } from "@/lib/db";
import { log } from "@/lib/log";
import { aiErrorMessage } from "@/lib/ai/client";
import { notify } from "@/lib/notifications/create";
import { analysesForVideos, analyzeVideo, AiStepError, scoreRelevance, summarizePatterns } from "./ai";
import { providerFor } from "./providers";
import { ProviderError } from "./providers/types";
import { finalScore, intrinsicScores, velocityScores, videoDedupKey } from "./score";
import { getTrendSettings } from "./settings";
import { getVideos, upsertVideo } from "./store";
import type { NormalizedVideo, SearchPlan, SearchStatus } from "./types";

// Pipeline del Radar. Corre adentro de un job de pg-boss (ver
// lib/jobs/trendJobs.ts), nunca en el request: puede tardar minutos.

const RELEVANCE_CANDIDATES = 120;
const DISCARD_BELOW_RELEVANCE = 35;

interface SearchRow {
  id: string;
  profile_id: string;
  client_id: string | null;
  saved_search_id: string | null;
  kind: "search" | "manual";
  prompt: string;
  plan: SearchPlan | null;
  status: SearchStatus;
  cached_from: string | null;
}

/** Clave de cache: el mismo plan (sin el resumen en texto) da los mismos resultados. */
export function cacheKeyFor(plan: SearchPlan): string {
  const { summary: _summary, ...rest } = plan;
  const stable = JSON.stringify(rest, Object.keys(rest).sort());
  return createHash("sha256").update(stable).digest("hex");
}

async function setProgress(id: string, status: SearchStatus, progress: number, message: string): Promise<void> {
  await query("update trend_searches set status = $2, progress = $3, progress_message = $4, updated_at = now() where id = $1", [
    id,
    status,
    progress,
    message,
  ]);
}

/**
 * Si hay una busqueda terminada con el mismo plan dentro del TTL, copia sus
 * resultados (sin volver a llamar a ningun proveedor). Devuelve true si uso cache.
 */
export async function tryReuseCache(searchId: string, plan: SearchPlan): Promise<boolean> {
  const settings = await getTrendSettings();
  const key = cacheKeyFor(plan);
  await query("update trend_searches set cache_key = $2 where id = $1", [searchId, key]);
  const hit = await queryOne<{ id: string; patterns: unknown; provider_notes: unknown }>(
    `select id, patterns, provider_notes from trend_searches
     where cache_key = $1 and status = 'done' and id <> $2 and cached_from is null
       and finished_at > now() - make_interval(hours => $3)
     order by finished_at desc limit 1`,
    [key, searchId, settings.cache_ttl_hours]
  );
  if (!hit) return false;
  await query(
    `insert into trend_search_results
       (search_id, video_id, position, relevance, relevance_reason, outlier_ratio, outlier_score, velocity, velocity_score,
        engagement_rate, engagement_score, final_score, discarded)
     select $1, video_id, position, relevance, relevance_reason, outlier_ratio, outlier_score, velocity, velocity_score,
        engagement_rate, engagement_score, final_score, discarded
     from trend_search_results where search_id = $2
     on conflict do nothing`,
    [searchId, hit.id]
  );
  await query(
    `update trend_searches set cached_from = $2, patterns = $3, provider_notes = $4 where id = $1`,
    [searchId, hit.id, JSON.stringify(hit.patterns), JSON.stringify(hit.provider_notes)]
  );
  return true;
}

/** Sin progreso durante este tiempo, una busqueda "en curso" se considera cortada (ej. reinicio por deploy). */
export const STALE_AFTER_MINUTES = 5;
const MAX_ATTEMPTS = 3;

/**
 * Corre la busqueda completa (o solo el analisis, si vino de cache o es un link manual).
 * Es reanudable: si se corto a mitad de camino (reinicio del server), al volver a
 * correrla no repite la busqueda en las plataformas si ya hay resultados, y los
 * analisis ya hechos salen del cache.
 */
export async function runSearchJob(searchId: string): Promise<void> {
  // "Reclamar" la busqueda: evita que dos workers la corran a la vez. Se puede
  // reclamar si nadie la tiene o si quien la tenia dejo de dar señales de vida.
  const claimed = await queryOne<{ attempts: number }>(
    `update trend_searches set claimed_at = now(), updated_at = now(), attempts = attempts + 1
     where id = $1 and status in ('queued', 'searching', 'analyzing')
       and (claimed_at is null or updated_at < now() - make_interval(mins => $2))
     returning attempts`,
    [searchId, STALE_AFTER_MINUTES]
  );
  if (!claimed) return;

  const search = await queryOne<SearchRow>(
    "select id, profile_id, client_id, saved_search_id, kind, prompt, plan, status, cached_from from trend_searches where id = $1",
    [searchId]
  );
  if (!search) return;
  const notes: string[] = [];

  if (claimed.attempts > MAX_ATTEMPTS) {
    await query(
      `update trend_searches set status = 'error', claimed_at = null, updated_at = now(), finished_at = now(),
         error = 'La búsqueda se interrumpió varias veces. Volvé a intentarlo.' where id = $1`,
      [searchId]
    );
    return;
  }

  try {
    const existing = await queryOne<{ n: number }>(
      "select count(*)::int as n from trend_search_results where search_id = $1",
      [searchId]
    );
    if (search.kind === "search" && !search.cached_from && (existing?.n ?? 0) === 0) {
      if (!search.plan) throw new AiStepError("La búsqueda no tiene plan.");
      await searchProviders(search, search.plan, notes);
    }
    await analyzeTop(search, notes);
    await finish(searchId, notes);
  } catch (err) {
    const message =
      err instanceof ProviderError || err instanceof AiStepError ? err.message : aiErrorMessage(err);
    log.error("trend search failed", { searchId, err: String(err) });
    await query(
      "update trend_searches set status = 'error', error = $2, provider_notes = $3, finished_at = now(), claimed_at = null, updated_at = now() where id = $1",
      [searchId, message, JSON.stringify(notes)]
    );
    await refreshCost(searchId);
  }
}

async function searchProviders(search: SearchRow, plan: SearchPlan, notes: string[]): Promise<void> {
  const usage = { profileId: search.profile_id, clientId: search.client_id, searchId: search.id };
  await setProgress(search.id, "searching", 5, "Buscando en las plataformas…");

  const runs = plan.providers.map(async (platform) => {
    const provider = providerFor(platform);
    if (!provider) {
      notes.push(`${platform}: no está configurado, se salteó.`);
      return [] as NormalizedVideo[];
    }
    try {
      return await provider.search(plan, { ...usage, note: (m) => notes.push(m) });
    } catch (err) {
      notes.push(`${provider.label}: ${err instanceof ProviderError ? err.message : "falló la búsqueda"}`);
      log.error("trend provider failed", { searchId: search.id, provider: provider.id, err: String(err) });
      return [] as NormalizedVideo[];
    }
  });
  const found = (await Promise.all(runs)).flat();

  // Deduplicar (la misma pieza puede venir por 2 keywords o por cuenta + hashtag).
  const unique = new Map<string, NormalizedVideo>();
  for (const v of found) {
    const key = videoDedupKey(v.platform, v.externalId);
    const prev = unique.get(key);
    // Si llega dos veces, quedarse con la version con mas datos.
    if (!prev || (v.views ?? -1) > (prev.views ?? -1) || (!prev.authorFollowers && v.authorFollowers)) unique.set(key, v);
  }
  const videos = Array.from(unique.values());
  if (videos.length === 0) {
    notes.push("No se encontraron videos con este plan. Probá ampliar el período, sacar el mínimo de vistas o sumar cuentas referentes.");
    return;
  }

  await setProgress(search.id, "searching", 30, `Guardando ${videos.length} videos…`);
  const ids: string[] = [];
  for (const v of videos) ids.push(await upsertVideo(v));

  const intrinsic = videos.map((v) => intrinsicScores(v));
  const velScores = velocityScores(intrinsic.map((s) => s.velocity));

  // Relevancia con IA sobre los mejores candidatos (por señales propias).
  const prelim = videos
    .map((v, i) => ({ i, pre: intrinsic[i].outlierScore ?? velScores[i] ?? intrinsic[i].engagementScore ?? Math.log10(1 + (v.likes ?? 0)) * 10 }))
    .sort((a, b) => b.pre - a.pre)
    .slice(0, RELEVANCE_CANDIDATES);

  await setProgress(search.id, "searching", 40, "La IA está filtrando lo relevante…");
  const relevance = await scoreRelevance(
    plan,
    search.prompt,
    prelim.map(({ i }) => ({
      index: i,
      platform: videos[i].platform,
      caption: videos[i].caption,
      hashtags: videos[i].hashtags,
      author: videos[i].authorHandle,
      durationSeconds: videos[i].durationSeconds,
    })),
    usage
  );

  const { weights } = await getTrendSettings();
  const rows = videos.map((v, i) => {
    const rel = relevance.get(i) ?? null;
    const s = intrinsic[i];
    const final = finalScore(
      { outlier: s.outlierScore, velocity: velScores[i], engagement: s.engagementScore, relevance: rel?.relevance ?? null },
      weights
    );
    return {
      videoId: ids[i],
      relevance: rel?.relevance ?? null,
      reason: rel?.reason ?? null,
      s,
      velocityScore: velScores[i],
      final: final.score,
      // sin puntaje de relevancia (no entro en los candidatos) o muy bajo: descartado
      discarded: rel == null || rel.relevance < DISCARD_BELOW_RELEVANCE,
    };
  });
  rows.sort((a, b) => Number(a.discarded) - Number(b.discarded) || (b.final ?? -1) - (a.final ?? -1));

  let position = 1;
  for (const r of rows) {
    await query(
      `insert into trend_search_results
         (search_id, video_id, position, relevance, relevance_reason, outlier_ratio, outlier_score, velocity, velocity_score,
          engagement_rate, engagement_score, final_score, discarded)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (search_id, video_id) do nothing`,
      [
        search.id, r.videoId, position++, r.relevance, r.reason, r.s.outlierRatio, r.s.outlierScore, r.s.velocity,
        r.velocityScore, r.s.engagementRate, r.s.engagementScore, r.final, r.discarded,
      ]
    );
  }
  const kept = rows.filter((r) => !r.discarded).length;
  await setProgress(search.id, "searching", 55, `${kept} videos relevantes de ${rows.length}.`);
}

async function analyzeTop(search: SearchRow, notes: string[]): Promise<void> {
  const usage = { profileId: search.profile_id, clientId: search.client_id, searchId: search.id };
  const { analyze_top_n } = await getTrendSettings();
  const top = await query<{ video_id: string; final_score: number | null }>(
    `select video_id, final_score from trend_search_results
     where search_id = $1 and not discarded order by position limit $2`,
    [search.id, search.kind === "manual" ? 1 : analyze_top_n]
  );
  if (top.length === 0) return;

  const videos = new Map((await getVideos(top.map((t) => t.video_id))).map((v) => [v.id, v]));
  let done = 0;
  await setProgress(search.id, "analyzing", 60, `Analizando ${top.length} videos con IA…`);

  // De a 3 en paralelo: rapido sin saturar la API.
  const queue = [...top];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const video = videos.get(item.video_id);
      if (!video) continue;
      try {
        await analyzeVideo(video, search.client_id, usage, { createdBy: search.profile_id });
      } catch (err) {
        notes.push(`No se pudo analizar un video de ${video.platform}: ${err instanceof AiStepError ? err.message : aiErrorMessage(err)}`);
      }
      done++;
      await setProgress(search.id, "analyzing", 60 + Math.round((done / top.length) * 30), `Analizados ${done} de ${top.length}…`);
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  if (search.kind === "manual") return;
  await setProgress(search.id, "analyzing", 92, "Buscando patrones en común…");
  const analyses = await analysesForVideos(top.map((t) => t.video_id), search.client_id);
  const patterns = await summarizePatterns(
    search.prompt,
    top
      .map((t) => ({ video: videos.get(t.video_id)!, analysis: analyses.get(t.video_id)?.analysis ?? null, score: t.final_score }))
      .filter((t) => t.video),
    usage
  );
  if (patterns) await query("update trend_searches set patterns = $2 where id = $1", [search.id, JSON.stringify(patterns)]);
}

async function refreshCost(searchId: string): Promise<void> {
  await query(
    `update trend_searches set cost_usd = coalesce((select sum(cost_usd) from provider_usage where search_id = $1), 0) where id = $1`,
    [searchId]
  );
}

async function finish(searchId: string, notes: string[]): Promise<void> {
  await query(
    `update trend_searches
       set status = 'done', progress = 100, progress_message = null, finished_at = now(), claimed_at = null, updated_at = now(),
           provider_notes = (select coalesce(jsonb_agg(distinct n), '[]'::jsonb) from jsonb_array_elements_text(provider_notes || $2::jsonb) n)
     where id = $1`,
    [searchId, JSON.stringify(notes)]
  );
  await refreshCost(searchId);
}

/** Busquedas que quedaron "en curso" sin progreso (server reiniciado a mitad de camino). */
export async function findStaleSearches(): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `select id from trend_searches
     where status in ('queued', 'searching', 'analyzing')
       and updated_at < now() - make_interval(mins => $1)
     order by created_at limit 20`,
    [STALE_AFTER_MINUTES]
  );
  return rows.map((r) => r.id);
}

// ===== Busquedas guardadas con alerta =====

export async function runDueSavedSearches(): Promise<void> {
  const due = await query<{
    id: string;
    profile_id: string;
    client_id: string | null;
    name: string;
    prompt: string;
    filters: unknown;
    plan: SearchPlan;
    min_score: number;
  }>(
    `select id, profile_id, client_id, name, prompt, filters, plan, min_score from saved_searches
     where active and (last_run_at is null or last_run_at < now() - make_interval(days => every_days))
     order by last_run_at nulls first limit 5`
  );

  for (const s of due) {
    await query("update saved_searches set last_run_at = now() where id = $1", [s.id]);
    const row = await queryOne<{ id: string }>(
      `insert into trend_searches (profile_id, client_id, saved_search_id, prompt, filters, plan, status, cache_key)
       values ($1, $2, $3, $4, $5, $6, 'queued', $7) returning id`,
      [s.profile_id, s.client_id, s.id, s.prompt, JSON.stringify(s.filters ?? {}), JSON.stringify(s.plan), cacheKeyFor(s.plan)]
    );
    if (!row) continue;
    // Las alertas no reutilizan cache: el punto es encontrar lo nuevo.
    await runSearchJob(row.id);

    const fresh = await query<{ n: number }>(
      `select count(*)::int as n from trend_search_results r
       where r.search_id = $1 and not r.discarded and r.final_score >= $2
         and not exists (
           select 1 from trend_search_results old
           join trend_searches os on os.id = old.search_id
           where os.saved_search_id = $3 and os.id <> $1 and old.video_id = r.video_id
         )`,
      [row.id, s.min_score, s.id]
    );
    const n = fresh[0]?.n ?? 0;
    if (n > 0) {
      await notify(
        s.profile_id,
        "trend_alert",
        `Radar: ${n} video${n === 1 ? "" : "s"} nuevo${n === 1 ? "" : "s"} en "${s.name}"`,
        `Superan el score ${s.min_score}.`,
        `/marketing/radar/${row.id}?nuevos=1`
      );
    }
  }
}
