import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Cliente unico de la API de Claude. Sin ANTHROPIC_API_KEY la IA queda
// apagada (las pantallas muestran un aviso en vez de romper), igual que
// Resend/Sentry.

// Configurable por env (ANTHROPIC_MODEL) para poder cambiar de modelo sin
// tocar codigo. Por defecto, Claude Opus 5.5.
export const AI_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";

// Modelos que aceptan el reintento automatico del lado del servidor
// (`fallbacks: "default"`). Si el modelo configurado no esta en la lista
// (ej. un Haiku), no se manda el parametro: la API lo rechazaria.
const SERVER_FALLBACK_MODELS = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
  "claude-fable-5-2",
  "claude-fable-5-1",
]);

type FallbackParams = { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } | Record<string, never>;

/** Si el modelo principal declina un pedido por sus filtros de seguridad, la API reintenta sola con otro modelo dentro de la misma llamada. */
export function aiFallbackFor(model: string): FallbackParams {
  return SERVER_FALLBACK_MODELS.has(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : {};
}

export const AI_FALLBACK = aiFallbackFor(AI_MODEL);

let client: Anthropic | null = null;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAiClient(): Anthropic {
  if (!isAiConfigured()) {
    throw new Error("ANTHROPIC_API_KEY no está configurada.");
  }
  client ??= new Anthropic();
  return client;
}

/** Mensaje en castellano para errores de la API, sin filtrar detalles internos. */
export function aiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "La clave de la IA es inválida. Revisá ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError) return "La IA está saturada en este momento. Probá de nuevo en un minuto.";
  if (err instanceof Anthropic.APIConnectionError) return "No se pudo conectar con la IA. Probá de nuevo.";
  if (err instanceof Anthropic.APIError) return `La IA devolvió un error (${err.status ?? "?"}). Probá de nuevo.`;
  return "Algo salió mal con la IA. Probá de nuevo.";
}
