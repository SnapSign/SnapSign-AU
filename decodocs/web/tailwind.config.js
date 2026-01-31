/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f4ea',
          100: '#b3e0c2',
          500: '#3498db',
          600: '#2980b9',
          700: '#219653',
        },
        risk: {
          high: '#dc3545',
          medium: '#fd7e14',
          low: '#ffc107',
        },
      },
    },
  },
  plugins: [],
}
