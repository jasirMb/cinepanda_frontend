/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cine: {
          primary: {
            DEFAULT: "#3076A1"
          },
          secondary: {
            DEFAULT: "#564077"
          }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}

