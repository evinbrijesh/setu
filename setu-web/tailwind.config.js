/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00236f",
        "on-primary": "#ffffff",
        "primary-container": "#1e3a8a",
        "on-primary-container": "#90a8ff",
        "primary-fixed": "#dce1ff",
        "primary-fixed-dim": "#b6c4ff",
        "on-primary-fixed": "#00164e",
        "on-primary-fixed-variant": "#264191",
        "inverse-primary": "#b6c4ff",

        secondary: "#5c5f60",
        "on-secondary": "#ffffff",
        "secondary-container": "#dee0e2",
        "on-secondary-container": "#606365",
        "secondary-fixed": "#e1e2e4",
        "secondary-fixed-dim": "#c5c6c8",
        "on-secondary-fixed": "#191c1e",
        "on-secondary-fixed-variant": "#444749",

        tertiary: "#003122",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#004a35",
        "on-tertiary-container": "#70bb9c",
        "tertiary-fixed": "#a6f2d1",
        "tertiary-fixed-dim": "#8bd6b6",
        "on-tertiary-fixed": "#002116",
        "on-tertiary-fixed-variant": "#00513b",

        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        background: "#f8f9ff",
        "on-background": "#121c28",
        surface: "#f8f9ff",
        "on-surface": "#121c28",
        "surface-dim": "#d1dbec",
        "surface-bright": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eef4ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dfe9fa",
        "surface-container-highest": "#d9e3f4",
        "surface-variant": "#d9e3f4",
        "on-surface-variant": "#444651",

        outline: "#757682",
        "outline-variant": "#c5c5d3",
        "surface-tint": "#4059aa",

        inverse: "#27313e",
        "inverse-on-surface": "#eaf1ff",
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },
      spacing: {
        "section-margin": "64px",
        "stack-gap": "32px",
        "container-padding": "24px",
        gutter: "16px",
        unit: "8px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "headline-xl": [
          "40px",
          { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "headline-lg": [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "headline-lg-mobile": [
          "24px",
          { lineHeight: "32px", fontWeight: "600" },
        ],
        "body-lg": ["20px", { lineHeight: "30px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-lg": [
          "14px",
          {
            lineHeight: "20px",
            letterSpacing: "0.05em",
            fontWeight: "600",
          },
        ],
        "multilingual-subtext": [
          "18px",
          { lineHeight: "28px", fontWeight: "400" },
        ],
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "75%": { transform: "scale(1.15)", opacity: "0.5" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
