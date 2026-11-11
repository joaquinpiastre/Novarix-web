// Test de integracion del Radar contra un Postgres REAL y VACIO (descartable).
// No corre en `npm test` normal. Para correrlo:
//   docker run -d --rm --name pg-test -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:16-alpine
//   DATABASE_URL=postgresql://postgres:test@localhost:55432/postgres node scripts/migrate.js
//   RUN_DB_TESTS=1 DATABASE_URL=postgresql://postgres:test@localhost:55432/postgres npx vitest run lib/trends/pipeline.db.test.ts
// La IA se reemplaza por un mock (no hace falta ANTHROPIC_API_KEY) y los
// videos salen del proveedor de ejemplo.
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./ai", async (orig) => {
  const real = await orig<typeof import("./ai")>();
  const { query } = await import("@/lib/db");
  return {
    ...real,
    scoreRelevance: vi.fn(async (_p: unknown, _q: unknown, videos: { index: number }[]) => {
      const m = new Map<number, { relevance: number; reason: string }>();
      videos.forEach((v, i) => m.set(v.index, { relevance: i % 5 === 4 ? 10 : 80, reason: "mock" }));
      return m;
    }),
    analyzeVideo: vi.fn(async (video: { id: string }, clientId: string | null) => {
      const analysis = {
        hook: { type: "antes_despues", description: "d" },
        format: "f", structure: ["a"], pacing: "p", on_screen_text: "t", cta: "c",
        why_it_worked: ["porque sí"],
        adaptations: [{ title: "Idea", hook: "h", script: "s", shots: [{ time: "0-3s", shot: "x", on_screen_text: "", voiceover: "" }] }],
        confidence: "media",
      };
      const rows = await query(
        `insert into trend_analyses (video_id, client_id, hook_type, analysis, model) values ($1,$2,'antes_despues',$3,'mock')
         on conflict (video_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid)) do update set analysis = excluded.analysis returning *`,
        [video.id, clientId, JSON.stringify(analysis)]
      );
      return rows[0];
    }),
    summarizePatterns: vi.fn(async () => ({
      summary: "s", common_hooks: [{ type: "antes_despues", count: 3, example: "e" }], formats: ["f"], insights: ["i"], recommendations: ["r"],
      avg_duration_seconds: 20, top_hashtags: [{ tag: "x", count: 2 }],
    })),
  };
});

import { query, queryOne } from "@/lib/db";
import { runSearchJob, tryReuseCache, cacheKeyFor, runDueSavedSearches } from "./pipeline";
import { searchResultCards, boardCards } from "./queries";
import { ownVideos, referenceStats } from "./diagnostics";
import { enforceYoutubeRetention } from "./maintenance";
import { checkAiLimit, checkSearchLimit, monthSpendUsd } from "./settings";
import { recordAiUsage, recordProviderUsage } from "@/lib/usage/record";
import { notifyUpcomingCommercialDates } from "@/lib/ideas/commercialDatesJob";
import { normalizePlan, type SearchPlan } from "./types";

const plan: SearchPlan = normalizePlan({
  summary: "s", keywords_es: ["antes y despues pintura"], keywords_en: [], synonyms: [], hashtags: ["pintura"],
  reference_accounts: [], providers: ["youtube", "instagram", "tiktok"], period_days: 30, language: "es", region: "AR",
  max_duration_seconds: 180, min_views: 0, relevance_criteria: "c",
});

let profileId = "";
let clientId = "";

beforeAll(async () => {
  if (!process.env.RUN_DB_TESTS) return;
  process.env.TRENDS_MOCK_PROVIDER = "on";
  profileId = (await queryOne<{ id: string }>("insert into profiles (email, password_hash, full_name, role) values ('a@x.test','x','Admin','admin') returning id"))!.id;
  clientId = (await queryOne<{ id: string }>("insert into clients (name) values ('Pinturería Test') returning id"))!.id;
});

describe.skipIf(!process.env.RUN_DB_TESTS)("Radar contra la base (integración)", () => {
  let searchId = "";

  it("corre el pipeline con el mock", async () => {
    searchId = (await queryOne<{ id: string }>(
      "insert into trend_searches (profile_id, client_id, prompt, plan, status, cache_key) values ($1,$2,'p',$3,'queued',$4) returning id",
      [profileId, clientId, JSON.stringify(plan), cacheKeyFor(plan)]
    ))!.id;
    await runSearchJob(searchId);
    const s = await queryOne<{ status: string; error: string | null; patterns: unknown; provider_notes: string[] }>("select status, error, patterns, provider_notes from trend_searches where id = $1", [searchId]);
    expect(s?.error).toBeNull();
    expect(s?.status).toBe("done");
    expect(s?.patterns).toBeTruthy();
    const cards = await searchResultCards(searchId, clientId);
    expect(cards.length).toBe(36);
    expect(cards.filter((c) => c.scores?.discarded).length).toBeGreaterThan(0);
    expect(cards.filter((c) => c.analysis).length).toBe(10);
    expect(cards[0].scores?.final).not.toBeNull();
  });

  it("reutiliza el caché", async () => {
    const id2 = (await queryOne<{ id: string }>(
      "insert into trend_searches (profile_id, client_id, prompt, plan, status) values ($1,$2,'p',$3,'queued') returning id",
      [profileId, clientId, JSON.stringify(plan)]
    ))!.id;
    expect(await tryReuseCache(id2, plan)).toBe(true);
    await runSearchJob(id2);
    const cards = await searchResultCards(id2, clientId);
    expect(cards.length).toBe(36);
  });

  it("tableros", async () => {
    const board = (await queryOne<{ id: string }>("insert into swipe_boards (name, client_id, created_by) values ('b',$1,$2) returning id", [clientId, profileId]))!.id;
    const v = (await queryOne<{ video_id: string }>("select video_id from trend_search_results where search_id = $1 order by position limit 1", [searchId]))!;
    await query("insert into swipe_items (board_id, video_id, added_by, tags) values ($1,$2,$3,'{a}')", [board, v.video_id, profileId]);
    const cards = await boardCards(board, clientId);
    expect(cards).toHaveLength(1);
    expect(cards[0].analysis).toBeTruthy();
    expect(cards[0].swipe?.tags).toEqual(["a"]);
  });

  it("alertas: avisa solo lo nuevo", async () => {
    const saved = (await queryOne<{ id: string }>(
      "insert into saved_searches (profile_id, client_id, name, prompt, plan, every_days, min_score) values ($1,$2,'alerta','p',$3,1,0) returning id",
      [profileId, clientId, JSON.stringify(plan)]
    ))!.id;
    await runDueSavedSearches();
    const n1 = await queryOne<{ n: number }>("select count(*)::int as n from notifications where kind = 'trend_alert'");
    expect(n1?.n).toBe(1);
    await query("update saved_searches set last_run_at = now() - interval '2 days' where id = $1", [saved]);
    await runDueSavedSearches();
    const n2 = await queryOne<{ n: number }>("select count(*)::int as n from notifications where kind = 'trend_alert'");
    expect(n2?.n).toBe(1); // mismos videos (mock deterministico): no hay nuevos
  });

  it("diagnóstico", async () => {
    const conn = (await queryOne<{ id: string }>("insert into meta_connections (client_id, access_token, created_by) values ($1,'x',$2) returning id", [clientId, profileId]))!.id;
    const asset = (await queryOne<{ id: string }>("insert into meta_assets (connection_id, client_id, asset_type, external_id) values ($1,$2,'instagram','1') returning id", [conn, clientId]))!.id;
    for (let i = 0; i < 5; i++) {
      await query(
        "insert into social_posts (asset_id, client_id, external_post_id, caption, posted_at, media_product_type, views, reach, likes, shares, saved, total_interactions, avg_watch_time_ms) values ($1,$2,$3,'cap #pintura',now() - ($4 || ' days')::interval,'REELS',$5,$5,10,2,3,15,4500)",
        [asset, clientId, `m${i}`, String(i * 3), 1000 * (i + 1)]
      );
    }
    const { videos, stats } = await ownVideos(clientId);
    expect(videos).toHaveLength(5);
    expect(stats.avg_views).toBe(3000);
    expect(stats.avg_watch_time_s).toBe(4.5);
    const refs = await referenceStats(clientId);
    expect(refs.videos).toBeGreaterThan(0);
    expect(refs.hooks[0]?.type).toBe("antes_despues");
  });

  it("consumo y límites", async () => {
    await recordProviderUsage({ provider: "youtube", operation: "search.list", profileId });
    const cost = await recordAiUsage("test", "claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 0 }, { profileId });
    expect(cost).toBeCloseTo(4, 5);
    expect(await monthSpendUsd()).toBeGreaterThanOrEqual(4);
    expect(await checkSearchLimit(profileId, "admin")).toBeNull();
    await query("update trend_settings set daily_ai_limits = '{\"admin\": 1}'");
    expect(await checkAiLimit(profileId, "admin")).toMatch(/límite/);
    await query("update trend_settings set monthly_budget_usd = 1, daily_ai_limits = '{}'");
    expect(await checkSearchLimit(profileId, "admin")).toMatch(/presupuesto/);
    const warn = await queryOne<{ n: number }>("select count(*)::int as n from notifications where kind = 'usage_budget'");
    expect(warn?.n).toBe(1);
  });

  it("retención YouTube y fechas comerciales", async () => {
    await query("update trend_videos set last_seen_at = now() - interval '40 days' where platform = 'youtube'");
    await enforceYoutubeRetention();
    const left = await query<{ views: number | null }>("select views from trend_videos where platform = 'youtube'");
    // solo queda el guardado en el tablero (si era de YouTube), sin estadísticas
    expect(left.every((r) => r.views == null)).toBe(true);
    await notifyUpcomingCommercialDates();
    await notifyUpcomingCommercialDates();
    const notices = await queryOne<{ n: number }>("select count(*)::int as n from commercial_date_notices");
    const notifs = await queryOne<{ n: number }>("select count(*)::int as n from notifications where kind = 'commercial_date'");
    expect(notifs?.n).toBe(notices?.n);
  });
});
