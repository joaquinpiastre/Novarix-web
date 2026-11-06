export interface ChecklistItemDef {
  key: string;
  label: string;
  /** Si falta, qué servicio del catálogo ofrece Novarix para resolverlo. */
  suggestedService: string;
}

export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { key: "web_activa", label: "Tiene web activa", suggestedService: "Sitio web" },
  { key: "pixel_meta", label: "Píxel de Meta instalado", suggestedService: "Meta Ads" },
  {
    key: "api_conversiones",
    label: "API de Conversiones configurada",
    suggestedService: "Meta Ads",
  },
  { key: "catalogo", label: "Catálogo de productos cargado", suggestedService: "E-commerce" },
  {
    key: "google_business",
    label: "Google Business Profile completo",
    suggestedService: "SEO",
  },
  {
    key: "bot_whatsapp",
    label: "Bot de WhatsApp/IG/FB activo",
    suggestedService: "Bot IA WhatsApp/Instagram/Facebook",
  },
  { key: "crm_pipeline", label: "CRM con pipeline de ventas", suggestedService: "CRM" },
  {
    key: "frecuencia_posteo",
    label: "Frecuencia de publicación constante",
    suggestedService: "Contenido y redes",
  },
  { key: "campanias_activas", label: "Campañas de pauta activas", suggestedService: "Meta Ads" },
  { key: "kit_marca", label: "Kit de marca completo", suggestedService: "Contenido y redes" },
  { key: "resenas", label: "Estrategia de reseñas activa", suggestedService: "SEO" },
  {
    key: "landing_campanas",
    label: "Landing page propia por campaña",
    suggestedService: "Sitio web",
  },
  {
    key: "seguimiento_leads",
    label: "Seguimiento de leads sistematizado",
    suggestedService: "CRM",
  },
];
