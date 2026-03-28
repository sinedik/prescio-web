/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':       'rgb(var(--bg-base) / <alpha-value>)',
        'bg-surface':    'rgb(var(--bg-surface) / <alpha-value>)',
        'bg-elevated':   'rgb(var(--bg-elevated) / <alpha-value>)',
        'bg-border':     'rgb(var(--bg-border) / <alpha-value>)',
        'text-primary':  'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary':'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted':    'rgb(var(--text-muted) / <alpha-value>)',
        'accent':        'rgb(var(--accent) / <alpha-value>)',
        'accent-hover':  'rgb(var(--accent-hover) / <alpha-value>)',
        'watch':         'rgb(var(--watch) / <alpha-value>)',
        'danger':        'rgb(var(--danger) / <alpha-value>)',
        'poly':          'rgb(var(--poly) / <alpha-value>)',
        'kalshi':        'rgb(var(--kalshi) / <alpha-value>)',
        'metaculus':     'rgb(var(--metaculus) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
