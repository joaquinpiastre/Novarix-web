import type { MetadataRoute } from "next";

// PWA instalable del portal de clientes. Reusa el icono de marca existente
// (app/icon.svg) -- un SVG alcanza para instalar en Chrome/Android modernos;
// para pixel-perfect en iOS/Android viejos convendria exportar PNGs 192/512
// del logo, que queda pendiente de que el diseño entregue los assets.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Novarix — Portal de clientes",
    short_name: "Novarix",
    description: "Seguí tus proyectos, aprobá contenido y gestioná tickets con Novarix.",
    start_url: "/portal",
    scope: "/portal",
    display: "standalone",
    background_color: "#0a0118",
    theme_color: "#7b2ff7",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
