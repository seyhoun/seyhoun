/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark palette — base layer
        base:     '#0d0f1a',
        surface:  '#12141f',
        elevated: '#1a1c2e',
        hover:    '#22253a',
        border:   '#2d3150',
        // Text
        'text-primary':   '#e2e4f0',
        'text-dim':       '#c8cadb',
        'text-secondary': '#8b8fa8',
        'text-muted':     '#5a5d75',
        'text-faint':     '#3d4060',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
