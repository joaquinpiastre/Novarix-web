import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Cliente unico de la API de Claude. Sin ANTHROPIC_API_KEY la IA queda
// apagada (las pantallas muestran un aviso en vez de romper), igual que
// Resend/Sentry.

export const AI_MODEL = "claude-opus-5-5";

// Si el modelo principal declina un pedido por sus filtros de seguridad, la
// API reintenta sola con otro modelo dentro de la misma llamada.
export const AI_FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

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
