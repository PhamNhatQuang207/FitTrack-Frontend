module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          lime: '#CCFF00',
          orange: '#FF5C00',
        },
        dark: {
          base: '#000000',
          deep: '#050505',
          card: '#0A0A0A',
          border: '#1A1A1A',
          muted: '#111111',
        },
      },
      fontFamily: {
        display: ['Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'neon-lime': '0 0 10px rgba(204,255,0,0.5), 0 0 30px rgba(204,255,0,0.2)',
        'neon-orange': '0 0 10px rgba(255,92,0,0.5), 0 0 30px rgba(255,92,0,0.2)',
        'neon-lime-sm': '0 0 6px rgba(204,255,0,0.4)',
        'neon-orange-sm': '0 0 6px rgba(255,92,0,0.4)',
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(204,255,0,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(204,255,0,0.04) 1px, transparent 1px)
        `,
        'grid-pattern-dense': `
          linear-gradient(rgba(204,255,0,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(204,255,0,0.06) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '40px 40px',
        'grid-dense': '20px 20px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'flicker': 'flicker 3s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(204,255,0,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(204,255,0,0.8), 0 0 40px rgba(204,255,0,0.3)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
}