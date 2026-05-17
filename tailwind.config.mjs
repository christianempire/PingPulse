/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Status palette — keep in sync with src/shared/thresholds.ts
        status: {
          green: '#22c55e',
          yellow: '#eab308',
          orange: '#f97316',
          red: '#ef4444'
        },
        surface: {
          0: '#0b0d12',
          1: '#11141b',
          2: '#171b24',
          3: '#1f2533',
          border: '#262c3a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.45)'
      }
    }
  },
  plugins: []
}
