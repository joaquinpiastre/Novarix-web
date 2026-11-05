// Next.js 14 requiere experimental.instrumentationHook (ver next.config.js)
// para que este archivo se ejecute. Carga la config de Sentry solo del lado
// que corresponde segun el runtime -- en Next 14, sentry.server.config.ts y
// sentry.edge.config.ts ya no se auto-cargan solos.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
