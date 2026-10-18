/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tgp-red': '#E50914',
        'tgp-red-dark': '#B20710',
        'tgp-black': '#111111',
        'tgp-dark': '#0D0D0D',
        'tgp-card': '#181818',
        'tgp-card-border': 'rgba(255, 255, 255, 0.1)',
        'tgp-white': '#FFFFFF',
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
        script: ['Caveat', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
