/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Grises con matiz azulado: más sofisticados que el gris neutro por defecto.
      colors: {
        gray: {
          50: "#F7F8FB", 100: "#EEF1F7", 200: "#DDE3EE", 300: "#C3CCDC", 400: "#8A94A8",
          500: "#667085", 600: "#4B5568", 700: "#344054", 800: "#1D2939", 900: "#0B1220",
        },
        zona: { marino: "#0B2A54", medio: "#14407F", azul: "#2F6FED" },
      },
      // Sombras en capas, suaves y teñidas de marino: dan profundidad real a las tarjetas.
      boxShadow: {
        sm: "0 1px 2px rgba(11,18,32,.06), 0 1px 1px rgba(11,18,32,.04)",
        DEFAULT: "0 2px 6px -1px rgba(11,42,84,.10), 0 1px 3px rgba(11,18,32,.06)",
        md: "0 4px 12px -2px rgba(11,42,84,.10), 0 2px 4px -2px rgba(11,18,32,.06)",
        lg: "0 10px 24px -8px rgba(11,42,84,.18), 0 4px 8px -4px rgba(11,18,32,.08)",
        xl: "0 18px 40px -12px rgba(11,42,84,.28), 0 6px 14px -6px rgba(11,18,32,.12)",
        "2xl": "0 28px 60px -16px rgba(11,42,84,.34)",
      },
      transitionTimingFunction: { zona: "cubic-bezier(0.22, 1, 0.36, 1)" },
    },
  },
  plugins: [],
};
