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
          bg: 'var(--raw-bg)',
          card: 'var(--raw-card)',
          'card-subtle': 'var(--raw-card-subtle)',
          elevated: 'var(--raw-elevated)',
          border: 'var(--raw-border)',
          text: 'var(--raw-text-primary)',
          'text-secondary': 'var(--raw-text-secondary)',
          'text-muted': 'var(--raw-text-muted)',
          primary: '#0B8FE3',
          'primary-hover': '#097ec9',
          secondary: '#86C5EE',
          darkbg: '#0A0A0A',
          darkcard: '#141414',
          darkelevated: '#1F1F1F',
          darkborder: '#2A2A2A',
        },
      },
    },
  },
  plugins: [],
}
