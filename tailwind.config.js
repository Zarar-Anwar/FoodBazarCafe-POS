/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          50: '#fdf8f3',
          100: '#f9ede0',
          200: '#f2d9bd',
          300: '#e8bf94',
          400: '#dc9d66',
          500: '#d17f42',
          600: '#c36637',
          700: '#a24f2f',
          800: '#83412b',
          900: '#6b3726',
          950: '#3a1b12',
        },
        sage: {
          500: '#5c7a6a',
          600: '#4a6356',
        },
      },
      fontFamily: {
        display: ['Segoe UI', 'system-ui', 'sans-serif'],
        body: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
