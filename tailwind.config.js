/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tgp-blue': '#0A1FD6',
        'tgp-blue-dark': '#0613A8',
        'tgp-card': '#1429E0',
        'tgp-lime': '#C6FF1A',
        'tgp-ink': '#07107A'
      },
      fontFamily: {
        anton: ['Anton', 'Impact', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
        caveat: ['Caveat', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
