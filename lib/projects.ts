export type Category = "web" | "app" | "software" | "ia" | "marketing" | "ecommerce";

export type MockupKind = "browser" | "phone" | "dashboard" | "table" | "chat" | "route";

export type Accent = "purple" | "magenta" | "violet";

export type Project = {
  id: string;
  title: string;
  sector: string;
  type: string;
  categories: Category[];
  mockup: MockupKind;
  accent: Accent;
  summary: string;
  challenge: string;
  solution: string;
  result: string;
  services: string[];
  link?: { href: string; label: string };
};

export const CATEGORIES: Category[] = ["web", "app", "software", "ia", "marketing", "ecommerce"];

export const CATEGORY_LABELS: Record<Category, string> = {
  web: "Web",
  app: "App móvil",
  software: "Software a medida",
  ia: "IA y bots",
  marketing: "Marketing y redes",
  ecommerce: "Ecommerce",
};

export const PROJECTS: Project[] = [
  {
    id: "hospital-espanol",
    title: "Hospital Español del Sur Mendocino",
    sector: "Salud · Mendoza",
    type: "App móvil multiplataforma + Sitio web",
    categories: ["app", "web"],
    mockup: "phone",
    accent: "magenta",
    summary: "App para socios y web institucional en un mismo ecosistema.",
    challenge:
      "Institución de salud que requería presencia institucional en web y una herramienta digital para socios, usable en distintos dispositivos.",
    solution:
      "Aplicación móvil multiplataforma orientada a la información y gestión vinculada a los socios, junto con la página web de la institución.",
    result:
      "Canal institucional claro y una app accesible para afiliados, sin depender solo de canales presenciales o telefónicos.",
    services: ["App móvil multiplataforma", "Sitio web institucional", "Gestión para socios"],
  },
  {
    id: "punto-gardenia",
    title: "Punto Gardenia",
    sector: "Comercio",
    type: "Inteligencia artificial + Marketing + Redes sociales",
    categories: ["ia", "marketing"],
    mockup: "chat",
    accent: "purple",
    summary: "Sistema de IA, estrategia de marketing y manejo integral de redes.",
    challenge:
      "Atender las consultas de los clientes y sostener una presencia constante en redes sin que todo dependa de responder a mano.",
    solution:
      "Sistema de inteligencia artificial que atiende y ordena las conversaciones, sumado a estrategia de marketing y manejo de las redes sociales del negocio.",
    result:
      "Atención más ágil, canales de comunicación ordenados y una presencia en redes consistente.",
    services: ["Sistema de inteligencia artificial", "Marketing digital", "Manejo de redes sociales"],
  },
  {
    id: "full-advance",
    title: "Full Advance",
    sector: "Distribuidora",
    type: "Sistema de reparto",
    categories: ["software"],
    mockup: "route",
    accent: "violet",
    summary: "Sistema para organizar el reparto y seguir cada entrega.",
    challenge:
      "Organizar el reparto de la distribuidora: qué se entrega, en qué orden y en qué estado está cada pedido.",
    solution:
      "Sistema de reparto a medida para organizar las entregas y hacer seguimiento de cada pedido.",
    result:
      "Una operación de reparto más ordenada y con visibilidad del estado de cada entrega.",
    services: ["Sistema de reparto a medida", "Seguimiento de entregas"],
  },
  {
    id: "el-mana",
    title: "El Mana",
    sector: "Ferretería · Comercio",
    type: "Sistema de gestión",
    categories: ["software"],
    mockup: "table",
    accent: "magenta",
    summary: "Sistema de gestión para llevar el día a día de la ferretería.",
    challenge:
      "Ferretería con gran variedad de productos que necesitaba ordenar la gestión diaria del negocio.",
    solution:
      "Sistema de gestión a medida para administrar la operación del comercio en un solo lugar.",
    result: "Gestión centralizada y menos trabajo manual en la operación diaria.",
    services: ["Sistema de gestión a medida"],
  },
  {
    id: "centro-pintureria",
    title: "Centro Pinturería",
    sector: "Pinturería · Comercio",
    type: "Sistema de trackeo + Marketing digital",
    categories: ["software", "marketing"],
    mockup: "dashboard",
    accent: "purple",
    summary: "Sistema de trackeo y marketing digital para el comercio.",
    challenge:
      "Comercio con mucho movimiento que necesitaba ordenar el seguimiento de su actividad y apoyar la comunicación comercial con marketing.",
    solution:
      "Sistema de trackeo a medida para seguir la actividad del negocio, sumado a estrategia y gestión de marketing digital.",
    result:
      "Información ordenada para tomar decisiones y una comunicación de marketing alineada con lo que pasa en el negocio.",
    services: ["Sistema de trackeo a medida", "Marketing digital"],
  },
  {
    id: "ceramicasa",
    title: "Ceramicasa",
    sector: "Cerámica y construcción · San Rafael",
    type: "Desarrollo web + Marketing digital + MercadoLibre",
    categories: ["web", "marketing", "ecommerce"],
    mockup: "browser",
    accent: "violet",
    summary: "Catálogo online, marketing y sus ventas en MercadoLibre, todo manejado por nosotros.",
    challenge:
      "Cerámica y construcción en San Rafael: necesitaban un canal online sólido, marketing alineado al negocio y alguien que les maneje las ventas en MercadoLibre.",
    solution:
      "Desarrollo de la aplicación web del comercio, acompañamiento en marketing digital y gestión completa de su cuenta de MercadoLibre: publicaciones, precios y ventas.",
    result:
      "Un solo ecosistema digital para mostrar catálogo, generar confianza, sostener la comunicación comercial y vender en MercadoLibre sin que el cliente tenga que ocuparse.",
    services: ["Aplicación web", "Catálogo online", "Marketing digital", "Gestión de ventas en MercadoLibre"],
    link: {
      href: "https://www.ceramicasasanrafael.com",
      label: "ceramicasasanrafael.com",
    },
  },
  {
    id: "tirua",
    title: "Tirua",
    sector: "Plataforma de gestión",
    type: "Plataforma de gestión",
    categories: ["software"],
    mockup: "dashboard",
    accent: "magenta",
    summary: "Pagos, administración y herramientas operativas en un solo sistema.",
    challenge:
      "Centralizar pagos, administración y operaciones cotidianas en un sistema único, sin dispersar datos ni procesos.",
    solution:
      "Desarrollo de una plataforma para administrar pagos, gestión administrativa y utilidades operativas integradas.",
    result:
      "Una base técnica para ordenar cobros, backoffice y flujos de trabajo en un solo lugar.",
    services: ["Sistema de pagos", "Administración", "Herramientas operativas"],
  },
  {
    id: "don-ramon",
    title: "Frigorífico Don Ramón",
    sector: "Frigorífico",
    type: "Sistema de gestión + Trackeo",
    categories: ["software"],
    mockup: "dashboard",
    accent: "purple",
    summary: "Sistema de gestión con trackeo para seguir la operación del frigorífico.",
    challenge:
      "Frigorífico que necesitaba ordenar su gestión diaria y tener trazabilidad de la operación en lugar de llevarla de forma manual.",
    solution:
      "Sistema de gestión a medida con trackeo para seguir el proceso y la operación del frigorífico de punta a punta.",
    result: "Operación más ordenada y con trazabilidad real de lo que pasa en el día a día.",
    services: ["Sistema de gestión a medida", "Trackeo de operación"],
  },
  {
    id: "pena-boca-chos-malal",
    title: "Peña de Boca de Chos Malal",
    sector: "Club de socios · Chos Malal, Neuquén",
    type: "Sistema para socios",
    categories: ["software"],
    mockup: "table",
    accent: "magenta",
    summary: "Sistema para ordenar y gestionar a los socios de la peña.",
    challenge:
      "Club de hinchas con muchos socios que necesitaba una forma ordenada de gestionarlos, en lugar de planillas sueltas.",
    solution: "Sistema a medida para la gestión de socios de la peña.",
    result: "Gestión de socios centralizada y mucho más simple para la comisión del club.",
    services: ["Sistema de gestión de socios"],
  },
  {
    id: "afloo",
    title: "Afloo",
    sector: "Ecommerce",
    type: "Desarrollo de ecommerce",
    categories: ["ecommerce", "web"],
    mockup: "browser",
    accent: "violet",
    summary: "Tienda online a medida para vender sus productos.",
    challenge: "Necesitaban una tienda online propia para vender sus productos.",
    solution: "Desarrollo de un ecommerce a medida, de punta a punta.",
    result: "Un canal de venta online propio, listo para operar.",
    services: ["Desarrollo de ecommerce"],
  },
];
