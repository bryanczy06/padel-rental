/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#a7f3c0',
          400: '#34d468',
          500: '#22c24e',
          600: '#1ea844',
          700: '#178a38',
          800: '#126e2d',
          900: '#0d5222',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
