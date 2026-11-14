// Plataformas para la pestaña "Accesos" del cliente (sin imports de servidor).

export const CREDENTIAL_PLATFORMS = [
  { value: "google", label: "Google / Gmail", url: "https://accounts.google.com" },
  { value: "facebook", label: "Facebook", url: "https://www.facebook.com" },
  { value: "instagram", label: "Instagram", url: "https://www.instagram.com" },
  { value: "meta_business", label: "Meta Business Suite", url: "https://business.facebook.com" },
  { value: "tiktok", label: "TikTok", url: "https://www.tiktok.com/login" },
  { value: "youtube", label: "YouTube", url: "https://studio.youtube.com" },
  { value: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/login" },
  { value: "x", label: "X (Twitter)", url: "https://x.com/login" },
  { value: "whatsapp", label: "WhatsApp Business", url: "https://business.whatsapp.com" },
  { value: "google_business", label: "Google Business Profile", url: "https://business.google.com" },
  { value: "google_ads", label: "Google Ads", url: "https://ads.google.com" },
  { value: "email", label: "Email / correo", url: "" },
  { value: "hosting", label: "Hosting / cPanel", url: "" },
  { value: "dominio", label: "Dominio (NIC, GoDaddy…)", url: "https://nic.ar" },
  { value: "web", label: "Web / WordPress", url: "" },
  { value: "tienda", label: "Tienda online", url: "" },
  { value: "otro", label: "Otro", url: "" },
] as const;

export type CredentialPlatform = (typeof CREDENTIAL_PLATFORMS)[number]["value"];
export const CREDENTIAL_PLATFORM_VALUES = CREDENTIAL_PLATFORMS.map((p) => p.value) as [CredentialPlatform, ...CredentialPlatform[]];

export function platformLabel(value: string): string {
  return CREDENTIAL_PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

export function platformUrl(value: string): string {
  return CREDENTIAL_PLATFORMS.find((p) => p.value === value)?.url ?? "";
}

/** Lo que llega a la pantalla: nunca la contraseña (se pide aparte con "Mostrar"). */
export interface CredentialRow {
  id: string;
  platform: string;
  label: string | null;
  username: string | null;
  has_password: boolean;
  notes: string | null;
  login_url: string | null;
  two_factor: string | null;
  updated_at: string;
  updated_by_name: string | null;
  last_revealed_at: string | null;
  last_revealed_by_name: string | null;
}
