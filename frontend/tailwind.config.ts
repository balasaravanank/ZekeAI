import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zeke: {
          canvas: '#f8f7f4',
          surface: '#ffffff',
          border: '#e8e6e1',
          text: '#1a1a1a',
          muted: '#8a8680',
          accent: '#3b82f6',
          'accent-light': '#dbeafe',
          recording: '#ef4444',
          'recording-light': '#fee2e2',
          thinking: '#f59e0b',
          'thinking-light': '#fef3c7',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
