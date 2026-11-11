import "server-only";
import { query, queryOne } from "@/lib/db";
import { formatLabel } from "@/lib/marketing/content";

// Contexto de un cliente para los prompts de IA: datos basicos, kit de
// marca, plan de marketing vigente, lo que ya le funciono (posts con mejor
// rendimiento) y las ultimas referencias analizadas en el Radar.
// Todo esto son DATOS para el modelo, nunca instrucciones.

export interface ClientContextOptions {
  /** Incluye copys recientes del cliente (para mantener el estilo). */
  recentCopies?: boolean;
  /** Incluye los posts con mejor rendimiento y las ultimas referencias del Radar. */
  performance?: boolean;
}

export async function buildClientContext(clientId: string, opts: ClientContextOptions = {}): Promise<string> {
  const [client, kit, plan] = await Promise.all([
    queryOne<{ name: string; industry: string | null; city: string | null; website: string | null }>(
      "select name, industry, city, website from clients where id = $1",
      [clientId]
    ),
    queryOne<{ tone_of_voice: string | null; color_palette: string | null; fonts: string | null }>(
      "select tone_of_voice, color_palette, fonts from brand_kits where client_id = $1",
      [clientId]
    ),
    queryOne<{
      objectives: string | null;
      target_audience: string | null;
      value_proposition: string | null;
      channels: string[];
      period_start: string;
      period_end: string;
    }>(
      `select objectives, target_audience, value_proposition, channels, period_start, period_end
       from marketing_plans where client_id = $1 and status in ('active', 'approved')
       order by (status = 'active') desc, period_start desc limit 1`,
      [clientId]
    ),
  ]);

  const lines: (string | null)[] = [
    `Cliente: ${client?.name ?? "desconocido"}`,
    client?.industry ? `Rubro: ${client.industry}` : null,
    client?.city ? `Ciudad: ${client.city}` : null,
    client?.website ? `Web: ${client.website}` : null,
    kit?.tone_of_voice ? `Tono de voz de la marca: ${kit.tone_of_voice}` : null,
    kit?.color_palette ? `Colores de marca: ${kit.color_palette}` : null,
    plan?.objectives ? `Objetivos del plan vigente: ${plan.objectives}` : null,
    plan?.target_audience ? `Público objetivo: ${plan.target_audience}` : null,
    plan?.value_proposition ? `Propuesta de valor: ${plan.value_proposition}` : null,
    plan?.channels?.length ? `Redes del plan: ${plan.channels.join(", ")}` : null,
  ];

  if (opts.recentCopies) {
    const recent = await query<{ title: string; format: string; copy: string | null }>(
      `select title, format, copy from content_items
       where client_id = $1 and copy is not null
       order by created_at desc limit 5`,
      [clientId]
    );
    if (recent.length) {
      lines.push(
        `Copys recientes del cliente (para mantener el estilo):\n${recent
          .map((r) => `- [${formatLabel(r.format)}] ${r.title}: ${r.copy}`)
          .join("\n")}`
      );
    }
  }

  if (opts.performance) {
    const best = await query<{ caption: string | null; views: number | null; total_interactions: number | null; media_product_type: string | null }>(
      `select caption, views, total_interactions, media_product_type from social_posts
       where client_id = $1 and posted_at > now() - interval '120 days'
       order by coalesce(views, 0) desc, coalesce(total_interactions, engagement, 0) desc limit 5`,
      [clientId]
    );
    if (best.length) {
      lines.push(
        `Publicaciones propias que mejor funcionaron (últimos 120 días):\n${best
          .map(
            (b) =>
              `- ${b.media_product_type ?? "post"} · ${b.views ?? "?"} vistas · ${b.total_interactions ?? "?"} interacciones: ${(b.caption ?? "").slice(0, 160)}`
          )
          .join("\n")}`
      );
    }
    const refs = await query<{ hook_type: string | null; caption: string | null; why: string | null }>(
      `select a.hook_type, v.caption, a.analysis->'why_it_worked'->>0 as why
       from trend_analyses a join trend_videos v on v.id = a.video_id
       where a.client_id = $1 order by a.created_at desc limit 5`,
      [clientId]
    );
    if (refs.length) {
      lines.push(
        `Últimas referencias virales analizadas en el Radar para este cliente:\n${refs
          .map((r) => `- gancho ${r.hook_type ?? "?"}: ${(r.caption ?? "").slice(0, 120)} — ${r.why ?? ""}`)
          .join("\n")}`
      );
    }
  }

  return lines.filter(Boolean).join("\n");
}
