/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  /** فئات الأدمن من tokens (متغيرات) — نضمن ظهورها في الـ CSS */
  safelist: [
    'text-[1.125rem]', 'text-[1.75rem]', 'md:text-[2rem]', 'tracking-[-0.01em]',
    'font-bold', 'font-extrabold', 'font-medium', 'text-slate-900', 'text-slate-600', 'tabular-nums',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#047857',
          light: '#059669',
          dark: '#065f46',
        },
        secondary: {
          DEFAULT: '#059669',
          light: '#10b981',
          dark: '#047857',
        },
      },
      fontFamily: {
        ar: ['IBM Plex Sans Arabic', 'sans-serif'],
        en: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'admin-page': ['1.5rem', { lineHeight: '1.35' }],
        'admin-section': ['1.0625rem', { lineHeight: '1.4' }],
        'admin-body': ['0.9375rem', { lineHeight: '1.5' }],
        'admin-meta': ['0.8125rem', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
}

