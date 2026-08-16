import type { Config } from "tailwindcss";

/** Raw Magic brand tokens (mirrors the storefront theme). */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBFBE3",
        sand: "#E7E3D7",
        ink: "#1A1A1A",
        green: "#5FA06B",
        "green-dark": "#2E4A38",
        terracotta: "#C15A32",
        "terracotta-dark": "#A94A26",
      },
      fontFamily: {
        heading: ['"Old Standard TT"', "Georgia", "serif"],
        body: ['"Nunito Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 46px -26px rgba(26,26,26,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
