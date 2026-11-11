import type { UsageContext } from "@/lib/usage/record";
import type { NormalizedVideo, Platform, ProviderId, SearchPlan } from "../types";

export interface ProviderRunContext extends UsageContext {
  /** Deja una nota visible en la busqueda (ej. "se alcanzó la cuota diaria de YouTube"). */
  note(message: string): void;
}

export interface TrendProvider {
  id: ProviderId;
  platform: Platform;
  label: string;
  /** Configurado por variables de entorno (no garantiza que la API responda). */
  isConfigured(): boolean;
  search(plan: SearchPlan, ctx: ProviderRunContext): Promise<NormalizedVideo[]>;
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}
