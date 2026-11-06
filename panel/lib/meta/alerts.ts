import "server-only";
import { query } from "@/lib/db";

async function raiseAlert(
  clientId: string,
  kind: string,
  severity: "info" | "warning" | "critical",
  message: string
): Promise<void> {
  // No duplicar: si ya hay una alerta sin resolver del mismo tipo para este
  // cliente, no se crea otra -- se espera a que se resuelva o se la deje
  // envejecer. Simple a proposito, sin deduplicacion mas fina por ahora.
  const existing = await query(
    "select 1 from alerts where client_id = $1 and kind = $2 and resolved = false",
    [clientId, kind]
  );
  if (existing.length > 0) return;

  await query(
    "insert into alerts (client_id, severity, kind, message) values ($1,$2,$3,$4)",
    [clientId, severity, kind, message]
  );
}

/**
 * Corre despues de cada sync de un cliente. Reglas deliberadamente simples
 * para esta primera version -- son un punto de partida, no un sistema de
 * scoring sofisticado.
 */
export async function checkAlertsForClient(clientId: string): Promise<void> {
  // 1) Campaña con gasto en los ultimos 3 dias y cero resultados.
  const noResults = await query<{ campaign_name: string; spend: string }>(
    `select campaign_name, sum(spend)::text as spend
     from meta_insights_daily
     where client_id = $1 and date >= current_date - interval '3 days' and campaign_id is not null
     group by campaign_name
     having sum(spend) > 0
        and sum(leads) = 0 and sum(purchases) = 0 and sum(messaging_conversations) = 0`,
    [clientId]
  );
  for (const c of noResults) {
    await raiseAlert(
      clientId,
      `no_results:${c.campaign_name}`,
      "warning",
      `La campaña "${c.campaign_name}" gastó ${c.spend} en los últimos 3 días sin resultados (leads, compras ni conversaciones).`
    );
  }

  // 2) Conexion de Meta caida o token por vencer.
  const connections = await query<{
    id: string;
    status: string;
    last_error: string | null;
    token_expires_at: string | null;
  }>("select id, status, last_error, token_expires_at from meta_connections where client_id = $1", [
    clientId,
  ]);
  for (const conn of connections) {
    if (conn.status === "error") {
      await raiseAlert(
        clientId,
        "connection_error",
        "critical",
        `La conexión con Meta falló: ${conn.last_error ?? "error desconocido"}.`
      );
    }
    if (conn.token_expires_at) {
      const expiresInDays =
        (new Date(conn.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (expiresInDays <= 7 && expiresInDays > 0) {
        await raiseAlert(
          clientId,
          "token_expiring",
          "warning",
          `El token de Meta vence en ${Math.ceil(expiresInDays)} día(s).`
        );
      }
    }
  }

  // 3) Sin contenido publicado en los ultimos 14 dias (si hay items cargados).
  const hasAnyContent = await query("select 1 from content_items where client_id = $1 limit 1", [
    clientId,
  ]);
  if (hasAnyContent.length > 0) {
    const recentPublished = await query(
      `select 1 from content_items
       where client_id = $1 and status = 'publicado' and published_at >= now() - interval '14 days'
       limit 1`,
      [clientId]
    );
    if (recentPublished.length === 0) {
      await raiseAlert(
        clientId,
        "no_posts",
        "warning",
        "No hay contenido publicado en los últimos 14 días."
      );
    }
  }

  // 4) Presupuesto de pauta superado en el plan activo.
  const overBudget = await query<{ id: string; budget_ads: string; spent: string }>(
    `select mp.id, mp.budget_ads::text, coalesce(sum(mi.spend), 0)::text as spent
     from marketing_plans mp
     left join meta_insights_daily mi
       on mi.client_id = mp.client_id and mi.date between mp.period_start and mp.period_end
     where mp.client_id = $1 and mp.status = 'active' and mp.budget_ads is not null
     group by mp.id, mp.budget_ads
     having coalesce(sum(mi.spend), 0) > mp.budget_ads`,
    [clientId]
  );
  for (const p of overBudget) {
    await raiseAlert(
      clientId,
      `budget_over:${p.id}`,
      "warning",
      `El gasto en pauta ($${p.spent}) superó el presupuesto del plan ($${p.budget_ads}).`
    );
  }
}
