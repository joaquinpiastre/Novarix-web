import "server-only";
import type { Platform } from "../types";
import { instagramProvider, isHashtagSearchEnabled } from "./instagram";
import { isMockEnabled, mockProviderFor } from "./mock";
import { tiktokApifyProvider, tiktokManualProvider, tiktokMode } from "./tiktok";
import type { TrendProvider } from "./types";
import { youtubeProvider } from "./youtube";

/**
 * Proveedor activo para cada plataforma. Si el real no esta configurado y el
 * mock esta prendido, se usa el mock (desarrollo). Si no, null.
 */
export function providerFor(platform: Platform): TrendProvider | null {
  const real =
    platform === "youtube"
      ? youtubeProvider
      : platform === "instagram"
        ? instagramProvider
        : tiktokMode() === "apify"
          ? tiktokApifyProvider
          : null;
  if (real?.isConfigured()) return real;
  if (isMockEnabled()) return mockProviderFor(platform);
  if (platform === "tiktok") return tiktokManualProvider;
  return null;
}

export interface ProviderStatus {
  platform: Platform;
  label: string;
  active: boolean;
  detail: string;
}

/** Estado para mostrar en pantalla (qué se va a poder buscar). */
export function providerStatuses(): ProviderStatus[] {
  const mock = isMockEnabled();
  return [
    {
      platform: "youtube",
      label: "YouTube Shorts",
      active: youtubeProvider.isConfigured() || mock,
      detail: youtubeProvider.isConfigured()
        ? "API oficial"
        : mock
          ? "Datos de ejemplo"
          : "Falta YOUTUBE_API_KEY",
    },
    {
      platform: "instagram",
      label: "Instagram Reels",
      active: instagramProvider.isConfigured() || mock,
      detail: instagramProvider.isConfigured()
        ? isHashtagSearchEnabled()
          ? "Cuentas referentes + hashtags"
          : "Solo cuentas referentes (hashtags pendientes de App Review)"
        : mock
          ? "Datos de ejemplo"
          : "Falta TRENDS_IG_ACCESS_TOKEN",
    },
    {
      platform: "tiktok",
      label: "TikTok",
      active: true,
      detail: tiktokMode() === "apify" ? "Apify (terceros)" : mock ? "Datos de ejemplo" : "Solo links manuales",
    },
  ];
}

export type { TrendProvider } from "./types";
