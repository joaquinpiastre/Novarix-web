import type { MetadataRoute } from "next";

// PWA instalable del portal de clientes, con el logo de marca (app/icon.png,
// 512x512, el mismo que usa Novarix Seller Hub).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Novarix — Portal de clientes",
    short_name: "Novarix",
    description: "Seguí tus proyectos, aprobá contenido y gestioná tickets con Novarix.",
    start_url: "/portal",
    scope: "/portal",
    display: "standalone",
    background_color: "#0b0f1c",
    theme_color: "#0b0f1c",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
