/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0F19',
          card: '#151C2C',
          border: '#1F293D',
          primary: '#3B82F6',
          success: '#10B981',
          danger: '#EF4444'
        }
      }
    },
  },
  plugins: [],
}
