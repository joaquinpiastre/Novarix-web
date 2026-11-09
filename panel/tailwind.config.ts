import type { Config } from "tailwindcss";

// Colores como triplets HSL (ver app/globals.css) para que funcionen los
// modificadores de opacidad (bg-accent/10) en modo claro y oscuro.
const c = (v: string) => `hsl(var(--c-${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        surface: c("surface"),
        "surface-hover": c("surface-hover"),
        border: c("border"),
        "text-primary": c("text-primary"),
        "text-muted": c("text-muted"),
        accent: c("accent"),
        "accent-hover": c("accent-hover"),
        "accent-fg": c("accent-fg"),
        success: c("success"),
        warning: c("warning"),
        danger: c("danger"),
      },
      fontFamily: {
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "14px", "2xl": "18px" },
      boxShadow: {
        card: "0 1px 0 hsl(var(--c-border) / .6), 0 8px 24px -12px hsl(var(--c-shadow) / .35)",
      },
    },
  },
  plugins: [],
};

export default config;
