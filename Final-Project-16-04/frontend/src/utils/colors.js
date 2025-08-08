// Color utility system for consistent gray and white theming
export const colors = {
  // Background colors
  background: {
    primary: 'bg-gray-50',
    secondary: 'bg-gray-100',
    tertiary: 'bg-gray-200',
    white: 'bg-white',
    card: 'bg-white',
    modal: 'bg-white',
    overlay: 'bg-black bg-opacity-50',
  },

  // Text colors
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    tertiary: 'text-gray-500',
    muted: 'text-gray-400',
    white: 'text-white',
    error: 'text-red-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  },

  // Border colors
  border: {
    primary: 'border-gray-300',
    secondary: 'border-gray-200',
    tertiary: 'border-gray-100',
    error: 'border-red-300',
    success: 'border-green-300',
    warning: 'border-yellow-300',
    info: 'border-blue-300',
  },

  // Button colors
  button: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    success: 'bg-green-600 text-white hover:bg-green-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  },

  // Input colors
  input: {
    default: 'bg-white text-gray-700 border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'bg-white text-gray-700 border-red-300 focus:border-red-500 focus:ring-red-500',
    success: 'bg-white text-gray-700 border-green-300 focus:border-green-500 focus:ring-green-500',
  },

  // Status colors
  status: {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  },

  // Role colors
  role: {
    creator: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    user: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
  },
};

// Utility functions for common color combinations
export const colorUtils = {
  // Get card styling
  card: (variant = 'default') => {
    const variants = {
      default: `${colors.background.card} ${colors.border.primary} ${colors.text.secondary}`,
      elevated: `${colors.background.card} ${colors.border.primary} ${colors.text.secondary} shadow-md`,
      interactive: `${colors.background.card} ${colors.border.primary} ${colors.text.secondary} hover:shadow-md transition-shadow`,
    };
    return variants[variant] || variants.default;
  },

  // Get button styling
  button: (variant = 'secondary') => {
    return colors.button[variant] || colors.button.secondary;
  },

  // Get input styling
  input: (state = 'default') => {
    return colors.input[state] || colors.input.default;
  },

  // Get text styling
  text: (variant = 'secondary') => {
    return colors.text[variant] || colors.text.secondary;
  },

  // Get background styling
  background: (variant = 'white') => {
    return colors.background[variant] || colors.background.white;
  },

  // Get border styling
  border: (variant = 'primary') => {
    return colors.border[variant] || colors.border.primary;
  },

  // Get role badge styling
  roleBadge: (role) => {
    return colors.role[role] || colors.role.user;
  },

  // Get status indicator styling
  statusIndicator: (status) => {
    return colors.status[status] || colors.status.offline;
  },
};

// Common class combinations
export const commonClasses = {
  // Layout
  container: `${colors.background.primary} ${colors.text.secondary}`,
  card: `${colors.background.card} ${colors.border.primary} ${colors.text.secondary} rounded-lg shadow-sm`,
  modal: `${colors.background.modal} ${colors.border.primary} ${colors.text.secondary} rounded-lg shadow-lg`,
  
  // Forms
  input: `${colors.input.default} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-opacity-50`,
  inputError: `${colors.input.error} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-opacity-50`,
  label: `${colors.text.primary} text-sm font-medium`,
  helpText: `${colors.text.tertiary} text-sm`,
  
  // Buttons
  buttonPrimary: `${colors.button.primary} rounded-md px-4 py-2 font-medium transition-colors`,
  buttonSecondary: `${colors.button.secondary} rounded-md px-4 py-2 font-medium transition-colors`,
  buttonGhost: `${colors.button.ghost} rounded-md px-4 py-2 font-medium transition-colors`,
  
  // Navigation
  navItem: `${colors.text.secondary} hover:${colors.text.primary} transition-colors`,
  navItemActive: `${colors.text.primary} ${colors.background.secondary}`,
  
  // Tables
  table: `${colors.background.white} ${colors.border.primary} rounded-lg overflow-hidden`,
  tableHeader: `${colors.background.secondary} ${colors.text.primary} font-medium`,
  tableRow: `${colors.background.white} ${colors.border.secondary} hover:${colors.background.secondary}`,
  tableCell: `${colors.text.secondary} px-4 py-3`,
  
  // Lists
  listItem: `${colors.background.white} ${colors.border.secondary} ${colors.text.secondary} px-4 py-3 hover:${colors.background.secondary}`,
  
  // Alerts
  alertSuccess: `${colors.background.white} ${colors.border.success} ${colors.text.success} rounded-lg p-4`,
  alertError: `${colors.background.white} ${colors.border.error} ${colors.text.error} rounded-lg p-4`,
  alertWarning: `${colors.background.white} ${colors.border.warning} ${colors.text.warning} rounded-lg p-4`,
  alertInfo: `${colors.background.white} ${colors.border.info} ${colors.text.info} rounded-lg p-4`,
};

// Theme configuration
export const theme = {
  colors,
  colorUtils,
  commonClasses,
  
  // Apply consistent styling to elements
  applyDefaults: () => {
    // This can be used to apply default styles to elements
    return {
      body: `${colors.background.primary} ${colors.text.secondary}`,
      headings: colors.text.primary,
      text: colors.text.secondary,
      links: `${colors.text.secondary} hover:${colors.text.primary}`,
      buttons: colors.button.secondary,
      inputs: colors.input.default,
    };
  },
};

export default theme; 