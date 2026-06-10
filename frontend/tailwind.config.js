/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#B45309',
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#D97706',
          500: '#B45309',
          600: '#92400e',
        },
        cf: {
          bg: '#020617',
          surface: '#111827',
          text: '#F8FAFC',
          muted: '#94A3B8',
          border: '#334155',
          navy: {
            900: '#0F172A',
            800: '#1E293B',
          },
          umber: {
            600: '#B45309',
            500: '#D97706',
          },
        },
        ink: {
          900: '#020617',
          800: '#0F172A',
          700: '#111827',
          600: '#1E293B',
          500: '#334155',
        },
        muted: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(180,83,9,0.25), 0 8px 30px rgba(180,83,9,0.12)',
      },
    },
  },
  plugins: [],
};
