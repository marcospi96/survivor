/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0A0F1E',
        card: '#0F172A',
        'card-light': '#131C2E',
        gold: '#F59E0B',
        crimson: '#EF4444',
        emerald: '#22C55E',
        'slate-bright': '#F8FAFC',
        'slate-muted': '#64748B',
      },
      fontFamily: {
        bebas: ['var(--font-bebas)', 'Impact', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-in': 'bounceIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'translateX(-50%) translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateX(-50%) translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(245,158,11,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(245,158,11,0.8)' },
        },
      },
      boxShadow: {
        'gold': '0 0 20px rgba(245, 158, 11, 0.15)',
        'gold-lg': '0 0 40px rgba(245, 158, 11, 0.2)',
        'green': '0 0 20px rgba(34, 197, 94, 0.1)',
        'green-lg': '0 0 30px rgba(34, 197, 94, 0.15)',
        'red': '0 0 20px rgba(239, 68, 68, 0.1)',
        'red-lg': '0 0 30px rgba(239, 68, 68, 0.15)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
