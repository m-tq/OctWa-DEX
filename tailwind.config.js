/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a',
        foreground: '#e5e5e5',
        card: '#1f1f1f',
        border: '#383838',
        primary: '#0000db',
        'primary-foreground': '#ffffff',
        secondary: '#2a2a2a',
        muted: '#6b6b6b',
        destructive: '#dc2626',
      },
      fontFamily: {
        mono: ['Fira Code', 'monospace'],
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
};
