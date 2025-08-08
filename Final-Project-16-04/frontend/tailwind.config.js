module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0078d4',
          dark: '#106ebe',
          50: 'rgba(0, 120, 212, 0.05)',
          100: 'rgba(0, 120, 212, 0.1)',
          200: 'rgba(0, 120, 212, 0.2)',
          300: 'rgba(0, 120, 212, 0.3)',
          400: 'rgba(0, 120, 212, 0.4)',
          500: 'rgba(0, 120, 212, 0.5)',
          600: 'rgba(0, 120, 212, 0.6)',
          700: 'rgba(0, 120, 212, 0.7)',
          800: 'rgba(0, 120, 212, 0.8)',
          900: 'rgba(0, 120, 212, 0.9)',
        },
        secondary: '#f3f2f1',
        accent: '#2b88d8',
        // Enhanced gray scale for better consistency
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // Consistent status colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      // Default styles for common elements
      backgroundColor: {
        'default': '#ffffff',
        'muted': '#f9fafb',
      },
      textColor: {
        'default': '#374151',
        'muted': '#6b7280',
      },
      borderColor: {
        'default': '#d1d5db',
        'muted': '#e5e7eb',
      },
    },
  },
  plugins: [
    // Plugin to add default styles
    function({ addBase, theme }) {
      addBase({
        // Light mode styles
        'html': { 
          backgroundColor: theme('colors.gray.50'),
          color: theme('colors.gray.700'),
        },
        'body': { 
          backgroundColor: theme('colors.gray.50'),
          color: theme('colors.gray.700'),
        },
        'input, textarea, select': {
          backgroundColor: theme('colors.white'),
          color: theme('colors.gray.700'),
          borderColor: theme('colors.gray.300'),
        },
        'button': {
          backgroundColor: theme('colors.white'),
          color: theme('colors.gray.700'),
          borderColor: theme('colors.gray.300'),
        },
        'a': {
          color: theme('colors.gray.700'),
        },
        'h1, h2, h3, h4, h5, h6': {
          color: theme('colors.gray.900'),
        },
        'p': {
          color: theme('colors.gray.700'),
        },
        'ul, ol': {
          color: theme('colors.gray.700'),
        },
        'table': {
          backgroundColor: theme('colors.white'),
          color: theme('colors.gray.700'),
        },
        'th, td': {
          color: theme('colors.gray.700'),
          borderColor: theme('colors.gray.300'),
        },
        
        // Dark mode styles
        '.dark html': { 
          backgroundColor: theme('colors.gray.900'),
          color: theme('colors.gray.100'),
        },
        '.dark body': { 
          backgroundColor: theme('colors.gray.900'),
          color: theme('colors.gray.100'),
        },
        '.dark input, .dark textarea, .dark select': {
          backgroundColor: theme('colors.gray.800'),
          color: theme('colors.gray.100'),
          borderColor: theme('colors.gray.600'),
        },
        '.dark button': {
          backgroundColor: theme('colors.gray.800'),
          color: theme('colors.gray.100'),
          borderColor: theme('colors.gray.600'),
        },
        '.dark a': {
          color: theme('colors.gray.100'),
        },
        '.dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6': {
          color: theme('colors.gray.50'),
        },
        '.dark p': {
          color: theme('colors.gray.100'),
        },
        '.dark ul, .dark ol': {
          color: theme('colors.gray.100'),
        },
        '.dark table': {
          backgroundColor: theme('colors.gray.800'),
          color: theme('colors.gray.100'),
        },
        '.dark th, .dark td': {
          color: theme('colors.gray.100'),
          borderColor: theme('colors.gray.600'),
        },
      })
    }
  ],
};
