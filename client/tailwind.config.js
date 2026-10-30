/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#F2F5FA',
          100: '#E3E9F3',
          200: '#C5D1E6',
          300: '#9AAED0',
          400: '#6A84B2',
          500: '#4A6595',
          600: '#364E7B',
          700: '#283C63',
          800: '#1B2B4B',
          900: '#111D36',
          950: '#0A1326',
        },
        brand: {
          50: '#EFF5FF',
          100: '#DBE7FE',
          200: '#BFD5FE',
          300: '#93B9FD',
          400: '#6094FA',
          500: '#3B71F3',
          600: '#2557E0',
          700: '#1E45C2',
          800: '#1E3A9C',
          900: '#1E357B',
        },
        ink: {
          DEFAULT: '#1A1F2B',
          muted: '#5E6675',
          subtle: '#8A92A1',
        },
        line: '#E6E8EE',
        canvas: '#F6F7F9',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16, 24, 40, 0.04), 0 1px 3px 0 rgba(16, 24, 40, 0.04)',
        pop: '0 12px 32px -8px rgba(16, 24, 40, 0.18), 0 4px 8px -4px rgba(16, 24, 40, 0.06)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgba(37, 87, 224, 0.35)' }, '100%': { boxShadow: '0 0 0 14px rgba(37, 87, 224, 0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
