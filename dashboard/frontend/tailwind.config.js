/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'monitor-bg': '#05070a',
        'monitor-panel': '#0d1117',
        'monitor-card': '#161b22',
        'monitor-accent': '#3062f8',
        'monitor-danger': '#ff3e3e',
        'monitor-warning': '#facc15',
        'monitor-success': '#10b981',
        'monitor-border': '#30363d',
      },
      fontFamily: {
        monitor: ['Inter', 'sans-serif'],
        'monitor-title': ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-success': '0 0 15px rgba(16, 185, 129, 0.4)',
        'glow-danger': '0 0 15px rgba(255, 62, 62, 0.4)',
        'glow-accent': '0 0 15px rgba(48, 98, 248, 0.4)',
      },
    },
  },
  plugins: [],
};
