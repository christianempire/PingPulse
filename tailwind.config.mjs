/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Status palette — keep in sync with src/shared/thresholds.ts
        status: {
          green: '#22D69A',
          yellow: '#F0B72B',
          orange: '#FF8A47',
          red: '#FF5D6B',
          gray: '#7C8493'
        },
        surface: {
          0: '#07090F',
          1: '#0B0E18',
          2: '#11151F'
        }
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
}
