// Tipos compartidos de la caja de ideas (sin imports de servidor).

export const IDEA_TOOLS = ["ideas", "ganchos", "guion", "reciclador", "hashtags", "fecha", "ads"] as const;
export type IdeaTool = (typeof IDEA_TOOLS)[number];

export const PILLARS = [
  { value: "educativo", label: "Educativo" },
  { value: "producto", label: "Producto / servicio" },
  { value: "detras_de_escena", label: "Detrás de escena" },
  { value: "testimonio", label: "Testimonio" },
  { value: "tendencia", label: "Tendencia" },
  { value: "promo", label: "Promo" },
] as const;
export type Pillar = (typeof PILLARS)[number]["value"];

export const AD_OBJECTIVES = [
  { value: "mensajes", label: "Mensajes (WhatsApp / Instagram)" },
  { value: "leads", label: "Generación de leads" },
  { value: "ventas", label: "Ventas / conversiones" },
  { value: "trafico", label: "Tráfico a la web" },
  { value: "alcance", label: "Alcance / reconocimiento" },
  { value: "interaccion", label: "Interacción" },
] as const;

/** Resultado normalizado de cualquier herramienta: una lista de tarjetas que se pueden guardar en el banco o mandar al calendario. */
export interface IdeaCard {
  title: string;
  body: string;
  format: string | null;
  pillar: string | null;
  tags: string[];
}

export interface IdeaBankItem {
  id: string;
  title: string;
  body: string | null;
  format: string | null;
  pillar: string | null;
  source: string;
  reference_url: string | null;
  content_item_id: string | null;
  created_at: string;
  author: string | null;
}

export const IDEA_SOURCE_LABELS: Record<string, string> = {
  ideas: "Generador de ideas",
  ganchos: "Ganchos",
  guion: "Guionista",
  reciclador: "Reciclador",
  hashtags: "Hashtags",
  fecha: "Fecha comercial",
  ads: "Ideas de Ads",
  chat: "Chat de estrategia",
  radar: "Radar viral",
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
