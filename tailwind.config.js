/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        capy: {
          bg: '#090b10',
          panel: '#11141c',
          panel2: '#171b25',
          stroke: '#293141',
          text: '#edf3ff',
          muted: '#8d98ac',
          gold: '#f6c661',
          mint: '#62e4b7'
        }
      }
    }
  },
  plugins: []
};
