/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        spectrum: {
          primary: '#1e3a5f',
          secondary: '#2563eb',
          accent: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
};
