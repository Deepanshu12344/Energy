/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        raw: {
          primary: '#0B8FE3',
          'primary-hover': '#097ec9',
          secondary: '#86C5EE',
          bg: '#F5F7FA',
          card: '#FFFFFF',
          border: '#E2E8F0',
          darkbg: '#0B0F19',
          darkcard: '#131B2E',
          darkborder: '#1E293B',
        },
      },
    },
  },
  plugins: [],
}
