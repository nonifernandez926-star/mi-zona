/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Grises con matiz azulado: más sofisticados que el gris neutro por defecto.
      colors: {
        gray: {
          50: "#F3F5FA", 100: "#EEF1F8", 200: "#E3E7F1", 300: "#CFD6E8", 400: "#8D95B0",
          500: "#5B6482", 600: "#4A5372", 700: "#2B3768", 800: "#161F4A", 900: "#0B1437",
        },
        zona: { marino: "#0B1437", medio: "#0A1235", azul: "#2350F5" },
      },
      // Sombras en capas, suaves y teñidas de marino: dan profundidad real a las tarjetas.
      boxShadow: {
        sm: "0 1px 2px rgba(11,20,55,.04)",
        DEFAULT: "0 1px 2px rgba(11,20,55,.05), 0 4px 10px rgba(11,20,55,.04)",
        md: "0 1px 2px rgba(11,20,55,.05), 0 6px 16px rgba(11,20,55,.06)",
        lg: "0 10px 28px rgba(11,20,55,.10)",
        xl: "0 16px 40px rgba(15,22,55,.12)",
        "2xl": "0 24px 56px rgba(15,22,55,.16)",
      },
      transitionTimingFunction: { zona: "cubic-bezier(0.22, 1, 0.36, 1)" },
    },
  },
  plugins: [],
};
