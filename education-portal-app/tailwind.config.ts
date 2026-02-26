import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        ink: "#1b1f24",
        dusk: "#2f3a4a",
        sand: "#f7f1e9",
        clay: "#e5d7c4",
        moss: "#0f766e",
        sun: "#d28a43"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        drift: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
          "100%": { transform: "translateY(0px)" }
        }
      },
      animation: {
        rise: "rise 600ms ease-out both",
        drift: "drift 6s ease-in-out infinite"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(27, 31, 36, 0.12)",
        card: "0 10px 24px rgba(27, 31, 36, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
