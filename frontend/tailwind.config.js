/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
      },
      colors: {
        brandPrimary: "#57f1db",
        brandSecondary: "#4fdbc8",
        brandTertiary: "#ffb875",
        bgPrimary: "#051424",
      },
      keyframes: {
        popBlock: {
          '0%, 10%': { opacity: '0', transform: 'scale(0.6)' },
          '20%, 80%': { opacity: '1', transform: 'scale(1)' },
          '90%, 100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        resolveConflict: {
          '0%, 45%': { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' },
          '50%, 95%': { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' },
        },
        float1: {
          '0%, 100%': { transform: 'translateY(0) rotate(2deg)' },
          '50%': { transform: 'translateY(-8px) rotate(-2deg)', borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.08)' },
        },
        float2: {
          '0%, 100%': { transform: 'translateY(0) rotate(-3deg)' },
          '50%': { transform: 'translateY(-6px) rotate(3deg)', borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.08)' },
        },
        float3: {
          '0%, 100%': { transform: 'translateY(0) rotate(1deg)' },
          '50%': { transform: 'translateY(-10px) rotate(-1deg)', borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.08)' },
        },
        swapLR: {
          '0%, 10%': { transform: 'translateX(0)' },
          '40%, 60%': { transform: 'translateX(calc(100% + 8px))' },
          '90%, 100%': { transform: 'translateX(0)' },
        },
        swapRL: {
          '0%, 10%': { transform: 'translateX(0)' },
          '40%, 60%': { transform: 'translateX(calc(-100% - 8px))' },
          '90%, 100%': { transform: 'translateX(0)' },
        },
        fadeInUp: {
          'from': { opacity: '0', transform: 'translateY(30px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'pop-block': 'popBlock 3s infinite ease-out',
        'resolve-conflict': 'resolveConflict 5s infinite steps(1)',
        'float-1': 'float1 6s infinite ease-in-out',
        'float-2': 'float2 7s infinite ease-in-out',
        'float-3': 'float3 8s infinite ease-in-out',
        'swap-lr': 'swapLR 4s infinite ease-in-out',
        'swap-rl': 'swapRL 4s infinite ease-in-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
      }
    },
  },
  plugins: [],
}
