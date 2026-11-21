/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Open Sans', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        obsidian: {
          950: '#07080c',
          900: '#0b0e14',
          850: '#10141d',
          800: '#151924',
          700: '#1e2433',
        },
        cyan: {
          DEFAULT: '#00F0FF',
          glow: 'rgba(0, 240, 255, 0.35)',
          dim: 'rgba(0, 240, 255, 0.15)'
        },
        amber: {
          DEFAULT: '#FFB800',
          glow: 'rgba(255, 184, 0, 0.35)',
          dim: 'rgba(255, 184, 0, 0.15)'
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.55)',
        'cyan-glow': '0 0 20px rgba(0, 240, 255, 0.28)',
        'amber-glow': '0 0 20px rgba(255, 184, 0, 0.28)',
        'card-elevated': '0 14px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)'
      },
      backdropBlur: {
        '2xl': '24px',
        '3xl': '36px'
      }
    },
  },
  plugins: [],
}

