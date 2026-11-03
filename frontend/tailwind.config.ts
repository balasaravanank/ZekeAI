import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zeke: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2a',
          accent: '#5eead4',
          'accent-dim': '#2dd4bf40',
          amber: '#f59e0b',
          text: '#e4e4e7',
          muted: '#71717a',
          'muted-2': '#3f3f46',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
