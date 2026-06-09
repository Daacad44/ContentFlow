/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ContentFlow brand palette (dark navy + orange accent)
        brand: {
          DEFAULT: '#ff7a1a',
          50: '#fff3e9',
          100: '#ffe0c4',
          400: '#ff9747',
          500: '#ff7a1a',
          600: '#e8650a',
        },
        ink: {
          900: '#0b1220',
          800: '#0f1729',
          700: '#111a2e',
          600: '#16203a',
          500: '#1e2a44',
        },
        muted: '#8aa0c2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,122,26,0.25), 0 8px 30px rgba(255,122,26,0.12)',
      },
    },
  },
  plugins: [],
};
