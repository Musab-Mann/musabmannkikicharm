import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0B0A0D",
        obsidian2: "#151217",
        ivory: "#F7F3ED",
        blush: "#EFE1DE",
        ink: "#241F1C",
        gold: {
          DEFAULT: "#C9A876",
          light: "#E4CB9C",
          dark: "#9C7C4D",
        },
        bronze: "#8C7A5E",
        rose: "#C98D8A",
        line: "#E4D9CE",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(36,31,28,0.15)",
        goldglow: "0 0 40px -8px rgba(201,168,118,0.45)",
      },
      keyframes: {
        drawline: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowpulse: {
          "0%,100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        drawline: "drawline 2.2s ease forwards",
        fadeUp: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        glowpulse: "glowpulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
