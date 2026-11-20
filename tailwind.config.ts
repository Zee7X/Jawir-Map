import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        parchment: { DEFAULT: "#faf8f5", deep: "#f5f0e6", card: "#fffdf8" },
        ink: { DEFAULT: "#292524", soft: "#57534e" },
        terra: { DEFAULT: "#c2410c", deep: "#9a3412" },
        gold: { DEFAULT: "#d97706", deep: "#b45309" },
        moss: "#047857",
        stamp: "#b91c1c",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        type: ["var(--font-type)", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
