/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
      },
      colors: {
        crypto: {
          blue: '#0e1a2b',
          neon: '#00ffe7',
          gold: '#ffd700',
        },
      },
      boxShadow: {
        neon: '0 0 10px #00ffe7, 0 0 20px #00ffe7',
      },
    },
  },
  plugins: [],
}