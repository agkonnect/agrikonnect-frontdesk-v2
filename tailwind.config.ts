import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Zinc-based surface palette (matches preview)
        surface: {
          bg:  '#09090b',   // page background
          0:   '#18181b',   // cards / sidebar
          1:   '#27272a',   // hover / elevated
          2:   '#3f3f46',   // borders
          3:   '#52525b',   // stronger borders
        },
        brand: {
          DEFAULT: '#10b981',
          light:   '#34d399',
          dim:     'rgba(16,185,129,0.12)',
          border:  'rgba(16,185,129,0.22)',
        },
      },
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        syne:  ['Syne', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(32px)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        popIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slideIn 0.22s ease-out',
        'pop-in':   'popIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
