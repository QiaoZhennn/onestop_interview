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
        coder: {
          bg: '#1a1a1a',
          surface: '#242424',
          card: '#2d2d2d',
          border: '#3d3d3d',
          brown: '#c4a882',
          'brown-light': '#d4bc9a',
          'brown-dark': '#a08968',
          grey: '#b8b8b8',
          'grey-light': '#d4d4d4',
          'grey-dark': '#888888',
          text: '#e0e0e0',
          'text-dim': '#999999',
          accent: '#c4a882',
          success: '#7dba6a',
          error: '#e06060',
          warning: '#d4a843',
        }
      },
      fontFamily: {
        mono: ['GeistMono', 'Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
