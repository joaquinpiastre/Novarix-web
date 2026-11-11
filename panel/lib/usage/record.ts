import "server-only";
import { query } from "@/lib/db";
import { log } from "@/lib/log";
import { estimateAiCost, type TokenUsage } from "@/lib/ai/pricing";

// Registro de consumo de proveedores externos (YouTube, Meta, Apify, Claude)
// en provider_usage. Lo lee el panel de consumo (/admin/consumo) y los
// limites diarios. Un fallo al registrar nunca corta la operacion real.

export interface UsageContext {
  profileId?: string | null;
  clientId?: string | null;
  searchId?: string | null;
}

export async function recordProviderUsage(
  entry: UsageContext & {
    provider: string;
    operation: string;
    units?: number;
    costUsd?: number;
  }
): Promise<void> {
  try {
    await query(
      `insert into provider_usage (provider, operation, units, cost_usd, profile_id, client_id, search_id)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        entry.provider,
        entry.operation,
        entry.units ?? 1,
        entry.costUsd ?? 0,
        entry.profileId ?? null,
        entry.clientId ?? null,
        entry.searchId ?? null,
      ]
    );
  } catch (err) {
    log.error("provider usage insert failed", { err: String(err), provider: entry.provider });
  }
}

/** Registra una llamada a Claude con sus tokens y el costo estimado. Devuelve el costo. */
export async function recordAiUsage(
  operation: string,
  model: string,
  usage: TokenUsage,
  ctx: UsageContext = {}
): Promise<number> {
  const cost = estimateAiCost(model, usage);
  try {
    await query(
      `insert into provider_usage
         (provider, operation, units, cost_usd, input_tokens, output_tokens, model, profile_id, client_id, search_id)
       values ('anthropic', $1, 1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        operation,
        cost,
        usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
        usage.output_tokens,
        model,
        ctx.profileId ?? null,
        ctx.clientId ?? null,
        ctx.searchId ?? null,
      ]
    );
  } catch (err) {
    log.error("ai usage insert failed", { err: String(err), operation });
  }
  return cost;
}
