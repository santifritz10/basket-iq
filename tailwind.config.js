/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        app: {
          background: "#0B0B0B",
          card: "#111111",
          border: "#27272A",
          text: {
            primary: "#FFFFFF",
            secondary: "#A1A1AA"
          },
          accent: "#F97316"
        }
      }
    }
  },
  plugins: []
};
