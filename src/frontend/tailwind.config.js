/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hot: '#ef4444',
        warm: '#f59e0b',
        cold: '#3b82f6'
      }
    },
  },
  plugins: [],
}
