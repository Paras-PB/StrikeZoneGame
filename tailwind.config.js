/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Orbitron", "sans-serif"],
        ui: ["var(--font-ui)", "Rajdhani", "sans-serif"],
      },
    },
  },
  plugins: [],
};
