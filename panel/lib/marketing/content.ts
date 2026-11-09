import type { UserRole } from "@/lib/types/domain";

// Constantes del calendario de contenido. Sin imports de servidor: las usan
// tanto los formularios (cliente) como las server actions y las tools de IA.

export const CONTENT_FORMATS = [
  { value: "reel", label: "Reel" },
  { value: "post", label: "Post" },
  { value: "carrusel", label: "Carrusel" },
  { value: "historia", label: "Historia" },
  { value: "video", label: "Video largo" },
  { value: "anuncio", label: "Anuncio" },
  { value: "vivo", label: "Vivo / streaming" },
  { value: "otro", label: "Otro" },
] as const;

export const SOCIAL_NETWORKS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "x", label: "X (Twitter)" },
  { value: "other", label: "Otra" },
] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number]["value"];
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]["value"];

export const CONTENT_FORMAT_VALUES = CONTENT_FORMATS.map((f) => f.value) as [ContentFormat, ...ContentFormat[]];
export const SOCIAL_NETWORK_VALUES = SOCIAL_NETWORKS.map((n) => n.value) as [SocialNetwork, ...SocialNetwork[]];

/** El contenido solo se puede delegar a gente de marketing (administradora o no). */
export const CONTENT_ASSIGNABLE_ROLES: UserRole[] = ["marketing", "marketing_admin"];

export function formatLabel(value: string): string {
  return CONTENT_FORMATS.find((f) => f.value === value)?.label ?? value;
}

export function networkLabel(value: string): string {
  return SOCIAL_NETWORKS.find((n) => n.value === value)?.label ?? value;
}
