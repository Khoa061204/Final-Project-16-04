module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
          50: 'rgba(99, 102, 241, 0.05)',
          100: 'rgba(99, 102, 241, 0.1)',
          200: 'rgba(99, 102, 241, 0.2)',
          300: 'rgba(99, 102, 241, 0.3)',
          400: 'rgba(99, 102, 241, 0.4)',
          500: 'rgba(99, 102, 241, 0.5)',
          600: 'rgba(99, 102, 241, 0.6)',
          700: 'rgba(99, 102, 241, 0.7)',
          800: 'rgba(99, 102, 241, 0.8)',
          900: 'rgba(99, 102, 241, 0.9)',
        },
        secondary: '#f3f4f6',
        accent: '#8b5cf6',
      },
    },
  },
  plugins: [],
};
