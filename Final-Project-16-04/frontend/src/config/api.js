// API Configuration
const API_CONFIG = {
  // Base URL for API calls
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  
  // WebSocket URL
  WS_URL: process.env.REACT_APP_WS_URL || 'http://localhost:5000',
  
  // Timeout settings
  TIMEOUT: 30000, // 30 seconds
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
  return `${baseUrl}/${cleanEndpoint}`;
};

// Helper function to get WebSocket URL
export const getWsUrl = () => {
  return API_CONFIG.WS_URL;
};

// Helper function to get auth headers
export const getAuthHeaders = (token) => {
  return {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export default API_CONFIG; 