/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx}',
    './sidepanel/**/*.{html,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        fpl: {
          dark: '#0f172a',
          surface: '#1e293b',
          card: '#182234',
          accent: '#00ff87',
          cyan: '#38bdf8',
          purple: '#37003c',
          pink: '#e90052',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
