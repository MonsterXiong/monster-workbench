/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: ["Consolas", "Cascadia Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        workbench: {
          primary: "#5b6cf8",
          "primary-content": "#ffffff",
          secondary: "#0f9ad6",
          "secondary-content": "#ffffff",
          accent: "#8b5cf6",
          "accent-content": "#ffffff",
          neutral: "#2f3646",
          "neutral-content": "#f8fafc",
          "base-100": "#ffffff",
          "base-200": "#f5f7fb",
          "base-300": "#dce3ee",
          "base-content": "#1f2937",
          info: "#0ea5e9",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
    ],
    darkTheme: "workbench",
  },
};
