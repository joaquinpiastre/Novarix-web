// Precios por millon de tokens (USD), API de Anthropic, tomados de la
// documentacion al 2026-11-11. Solo sirven para ESTIMAR el costo en el panel
// de consumo -- la factura real es la de console.anthropic.com.
// Sin imports de servidor: lo usan tests y pantallas.

interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
}

const PRICES: Record<string, ModelPrice> = {
  "claude-fable-5-2": { input: 8, output: 40, cacheRead: 0.2 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 1 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

const DEFAULT_PRICE = PRICES["claude-opus-5-5"];

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Costo estimado en USD de una respuesta. Escritura de cache: 1,25x el precio de entrada. */
export function estimateAiCost(model: string, usage: TokenUsage): number {
  const price = PRICES[model] ?? DEFAULT_PRICE;
  const perToken = (perMillion: number) => perMillion / 1_000_000;
  return (
    usage.input_tokens * perToken(price.input) +
    (usage.cache_creation_input_tokens ?? 0) * perToken(price.input) * 1.25 +
    (usage.cache_read_input_tokens ?? 0) * perToken(price.cacheRead) +
    usage.output_tokens * perToken(price.output)
  );
}
