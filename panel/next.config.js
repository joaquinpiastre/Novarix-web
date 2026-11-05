const { withSentryConfig } = require("@sentry/nextjs/config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 14 necesita este flag para que instrumentation.ts (carga de Sentry
  // server/edge, y mas adelante el worker de pg-boss en la Fase 3) corra.
  experimental: {
    instrumentationHook: true,
  },
};

// Sin SENTRY_AUTH_TOKEN (todavia no hay cuenta de Sentry), dryRun evita que
// el plugin intente subir sourcemaps y falle el build.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
});
