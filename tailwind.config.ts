import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#00d9ff",
          50: "#e6fbff",
          100: "#ccf7ff",
          200: "#99efff",
          300: "#66e7ff",
          400: "#33dfff",
          500: "#00d9ff",
          600: "#00aecc",
          700: "#008299",
          800: "#005766",
          900: "#002b33",
        },
        secondary: {
          DEFAULT: "#1a1f2e",
          50: "#f0f1f3",
          100: "#e1e3e7",
          200: "#c3c7cf",
          300: "#a5abb7",
          400: "#878f9f",
          500: "#697387",
          600: "#4a5265",
          700: "#2b3143",
          800: "#1a1f2e",
          900: "#0d0f17",
        },
        accent: {
          DEFAULT: "#ff6b6b",
          light: "#ff8787",
          dark: "#ee5a52",
        },
        success: {
          DEFAULT: "#51cf66",
          light: "#8ce99a",
          dark: "#37b24d",
        },
        medical: {
          cyan: "#00d9ff",
          teal: "#20c997",
          blue: "#339af0",
        },
      },
      fontFamily: {
        sans: ['var(--font-roboto-slab)', 'serif'],
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 217, 255, 0.3)',
        'glow-lg': '0 0 30px rgba(0, 217, 255, 0.4)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
