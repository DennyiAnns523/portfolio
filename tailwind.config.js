/** @type {import('tailwindcss').Config} **/
module.exports = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // The world's palette (see public/world-demo.html), so the admin area feels like part of it.
      colors: {
        paper: '#f2efe7',
        panel: '#faf8f0',
        ink: '#302c3c',
        muted: '#6b6570',
        line: '#d6d0c9',
        orange: '#ee7046',
        plum: '#74668c',
        moss: '#5f7a52',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
