/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media', // Uses system preference
  theme: {
    extend: {
      colors: {
        // One Dark Pro color scheme
        onedark: {
          bg: '#282c34',
          'bg-light': '#21252b',
          'bg-lighter': '#2c313a',
          'bg-highlight': '#3e4451',
          fg: '#abb2bf',
          'fg-muted': '#5c6370',
          red: '#e06c75',
          green: '#98c379',
          yellow: '#e5c07b',
          blue: '#61afef',
          purple: '#c678dd',
          cyan: '#56b6c2',
          orange: '#d19a66',
        },
      },
    },
  },
  plugins: [],
}
