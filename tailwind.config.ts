import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        sunken: 'var(--sunken)',
        line: 'var(--line)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        soft: 'var(--soft)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'green-bg': 'var(--green-bg)',
        'green-line': 'var(--green-line)',
        'green-soft': 'var(--green-soft)',
        urgent: 'var(--urgent)',
        star: 'var(--star)',
        danger: '#F26B6B',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      borderRadius: { card: '20px', btn: '14px' },
    },
  },
  plugins: [],
};
export default config;
