/** Colors and sizes are taken from the front-end design (PDF). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Hanken Grotesk"', '"Noto Sans Ethiopic"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0f1b2d',
        muted: '#4b5b72',
        faint: '#6b7a90',
        page: '#f1f3f8',
        line: '#d5dbe6',
        navy: { DEFAULT: '#0f1729', card: '#1a2540' },
        brand: { DEFAULT: '#0a5f58', dark: '#08504a', soft: '#e3f1ef', mid: '#b5d8d3' },
        st: { todo: '#5a6b82', progress: '#2563c9', done: '#1b7f4c', blocked: '#b8540b' },
        danger: { DEFAULT: '#a82a1c', soft: '#fbdbd6' },
        warn: { DEFAULT: '#7a4a06', soft: '#fde8c0' },
      },
      borderRadius: { card: '12px' },
    },
  },
  plugins: [],
};
