// Next.js 14 requiere experimental.instrumentationHook (ver next.config.js)
// para que este archivo se ejecute. Carga la config de Sentry solo del lado
// que corresponde segun el runtime -- en Next 14, sentry.server.config.ts y
// sentry.edge.config.ts ya no se auto-cargan solos.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // pg-boss (cola de jobs) corre adentro de este mismo proceso -- sin
    // segundo servicio en Railway. Si falla al arrancar (ej. DATABASE_URL
    // no disponible todavia en el primer instante de boot), se loguea pero
    // no tira abajo el server: la sync de Meta no es critica para que el
    // panel funcione.
    const { startMetaSyncJob } = await import("./lib/jobs/metaSyncJob");
    startMetaSyncJob().catch((err) => {
      console.error(JSON.stringify({ level: "error", msg: "startMetaSyncJob failed", err: String(err) }));
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
