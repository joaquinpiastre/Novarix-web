import type { Platform } from "./types";

// Parseo de links de videos y URLs de embed. Sin imports de servidor (lo usa
// tambien la UI). Nunca se descargan ni re-alojan videos: se embeben desde la
// plataforma original o se linkea.

export interface ParsedVideoLink {
  platform: Platform;
  externalId: string;
  canonicalUrl: string;
}

export function parseVideoUrl(raw: string): ParsedVideoLink | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] || null;
    else if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2] ?? null;
    else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? null;
    else id = url.searchParams.get("v");
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return { platform: "youtube", externalId: id, canonicalUrl: `https://www.youtube.com/shorts/${id}` };
  }

  if (host === "instagram.com") {
    const m = /^\/(?:[^/]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/.exec(url.pathname);
    if (!m) return null;
    const kind = m[1] === "p" ? "p" : "reel";
    return { platform: "instagram", externalId: m[2], canonicalUrl: `https://www.instagram.com/${kind}/${m[2]}/` };
  }

  if (host === "tiktok.com") {
    const m = /\/@([^/]+)\/(?:video|photo)\/(\d+)/.exec(url.pathname);
    if (!m) return null;
    return { platform: "tiktok", externalId: m[2], canonicalUrl: `https://www.tiktok.com/@${m[1]}/video/${m[2]}` };
  }

  return null;
}

/** Links cortos de TikTok (vm.tiktok.com / vt.tiktok.com) que hay que resolver siguiendo la redirección. */
export function isShortTikTokUrl(raw: string): boolean {
  try {
    const host = new URL(raw.trim()).hostname;
    return host === "vm.tiktok.com" || host === "vt.tiktok.com";
  } catch {
    return false;
  }
}

/** URL para el iframe. YouTube va por youtube-nocookie (sin tracking hasta que se reproduce). */
export function embedUrl(platform: Platform, externalId: string, url: string): string | null {
  if (externalId.startsWith("mock")) return null;
  if (platform === "youtube") return `https://www.youtube-nocookie.com/embed/${externalId}?rel=0&autoplay=1`;
  if (platform === "tiktok") return `https://www.tiktok.com/player/v1/${externalId}?description=1&music_info=1&autoplay=1`;
  if (platform === "instagram") {
    const kind = /\/p\//.test(url) ? "p" : "reel";
    return `https://www.instagram.com/${kind}/${externalId}/embed/`;
  }
  return null;
}
