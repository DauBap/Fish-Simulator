import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101412",
        panel: "#171c19",
        moss: "#9fc46b",
        clay: "#c98161",
      },
    },
  },
  plugins: [],
};

export default config;
