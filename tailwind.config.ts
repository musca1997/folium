import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        muted: "#777777",
        line: "#d8d8d8",
        soft: "#f7f7f7",
      },
    },
  },
  plugins: [],
};

export default config;
