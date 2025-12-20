/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'oklch(.546 .245 262.881)',
        'primary-dark': 'oklch(.488 .243 264.376)',
        secondary: 'oklch(.967 .003 264.542)',
        background: '#fff',
        foreground: 'oklch(.21 .034 264.665)',
        destructive: 'oklch(.577 .245 27.325)',
        
        'blue-50': 'oklch(.97 .014 254.604)',
        'blue-600': 'oklch(.546 .245 262.881)',
        'blue-700': 'oklch(.488 .243 264.376)',
        'red-500': 'oklch(.637 .237 25.331)',
        'red-600': 'oklch(.577 .245 27.325)',
        'gray-50': 'oklch(.985 .002 247.839)',
        'gray-100': 'oklch(.967 .003 264.542)',
        'gray-300': 'oklch(.872 .01 258.338)',
        'gray-600': 'oklch(.446 .03 256.802)',
        'gray-900': 'oklch(.21 .034 264.665)',
        'white': '#fff',
      },
      borderRadius: {
        lg: '0.625rem',
      },
    },
  },
  plugins: [],
};