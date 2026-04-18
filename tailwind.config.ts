import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
        },
        violet: {
          dark: "var(--violet-dark)",
          mid: "var(--violet-mid)",
        },
        purple: {
          DEFAULT: "var(--purple-main)",
          bright: "var(--purple-bright)",
        },
        accent: {
          magenta: "var(--accent-magenta)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
        },
        border: {
          subtle: "var(--border-subtle)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, var(--violet-dark) 0%, var(--purple-bright) 100%)",
        "gradient-text":
          "linear-gradient(90deg, var(--purple-bright) 0%, var(--accent-magenta) 100%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(123, 47, 247, 0.35)",
        "glow-sm": "0 0 24px rgba(168, 85, 247, 0.25)",
        "glow-btn": "0 0 20px rgba(123, 47, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.2)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 7s ease-in-out infinite 1s",
        "pulse-slow": "pulse-soft 4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-12px) translateX(4px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
