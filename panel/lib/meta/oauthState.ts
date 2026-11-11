// Helpers sin dependencias de servidor para el flujo "Conectar con Facebook".

export interface MetaOAuthState {
  /** client_id del panel */
  c: string;
  /** profile_id de quien arranco la conexion (tiene que ser el mismo al volver) */
  p: string;
  /** desde donde se arranco */
  f: "panel" | "portal";
}

export const PORTAL_HOST = "clientes.novarix.agency";

export function requestHost(headers: Headers): string | null {
  return headers.get("x-forwarded-host") ?? headers.get("host");
}

/** A donde vuelve la persona al terminar (respetando el dominio del portal, que no usa /portal en la URL). */
export function metaReturnPath(from: "panel" | "portal", clientId: string, host: string | null): string {
  if (from === "portal") {
    const bare = (host ?? "").split(",")[0].trim().replace(/:\d+$/, "").toLowerCase();
    return bare === PORTAL_HOST ? "/metrics" : "/portal/metrics";
  }
  return `/clients/${clientId}?tab=metricas`;
}

export function parseMetaOAuthState(raw: string | null): MetaOAuthState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as MetaOAuthState;
    if (typeof v.c !== "string" || typeof v.p !== "string" || (v.f !== "panel" && v.f !== "portal")) return null;
    return v;
  } catch {
    return null;
  }
}

export const META_CONNECT_MESSAGES: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  ok: { tone: "success", text: "¡Listo! Facebook e Instagram quedaron conectados. Las métricas aparecen en unos minutos." },
  cancelled: { tone: "warning", text: "Se canceló la conexión con Facebook. Podés intentarlo de nuevo cuando quieras." },
  no_assets: { tone: "warning", text: "Se conectó, pero no se compartió ninguna página, Instagram ni cuenta publicitaria. Volvé a conectar y elegí al menos una." },
  expired: { tone: "danger", text: "La conexión tardó demasiado o cambió la sesión. Volvé a intentarlo." },
  error: { tone: "danger", text: "No se pudo completar la conexión con Facebook. Volvé a intentarlo; si sigue fallando, avisá al equipo de Novarix." },
  not_configured: { tone: "warning", text: "La conexión con Facebook todavía no está habilitada (faltan META_APP_ID y META_APP_SECRET)." },
  preview: { tone: "warning", text: "En modo \"ver como cliente\" no se puede conectar Facebook." },
  owner_only: { tone: "warning", text: "Solo el titular de la cuenta puede conectar Facebook e Instagram." },
};
