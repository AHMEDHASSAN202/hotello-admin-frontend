import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0E2A47',
          deep: '#0A1F36',
          soft: '#3D4B5F',
        },
        gold: {
          DEFAULT: '#C8A24A',
          soft: '#F3E9D2',
        },
        paper: '#F7F8FA',
        line: '#E3E8EF',
        danger: '#B3402A',
        success: '#2F7D4F',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
