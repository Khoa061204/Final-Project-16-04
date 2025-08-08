import { getApiUrl, getAuthHeaders as getApiAuthHeaders } from '../config/api';

// Token management
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/**
 * Get the authentication token from localStorage
 * @returns {string|null} The authentication token or null if not found
 */
export const getToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    
    // Check if token is expired
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiry && new Date(expiry) <= new Date()) {
      removeToken();
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
};

/**
 * Set the authentication token in localStorage with expiry
 * @param {string} token - The token to store
 */
export const setTokenWithExpiry = (token) => {
  try {
    if (!token) {
      removeToken();
      return;
    }
    
    localStorage.setItem(TOKEN_KEY, token);
    
    // Set token expiry (1 hour from now)
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toISOString());
  } catch (error) {
    console.error('Error setting token with expiry:', error);
  }
};

/**
 * Set the authentication token in localStorage
 * @param {string} token - The token to store
 * @deprecated Use setTokenWithExpiry instead
 */
export const setToken = (token) => {
  console.warn('setToken is deprecated, use setTokenWithExpiry instead');
  setTokenWithExpiry(token);
};

/**
 * Remove the authentication token from localStorage
 */
export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

/**
 * Check if the user is authenticated (synchronous check)
 * @returns {boolean} True if the user is authenticated
 */
export const isAuthenticated = () => {
  try {
    const token = getToken();
    return !!token;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Verify token with server
 * @returns {Promise<{valid: boolean, user: Object|null}>} Token validity and user info
 */
export const verifyToken = async () => {
  try {
    const token = getToken();
    if (!token) {
      return { valid: false, user: null };
    }

    const response = await fetch(getApiUrl('/auth/verify'), {
      method: 'GET',
      headers: getApiAuthHeaders(token)
    });

    if (!response.ok) {
      removeToken();
      return { valid: false, user: null };
    }

    const data = await response.json();
    return { 
      valid: true, 
      user: data.user || null
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false, user: null };
  }
};

/**
 * Get the current user from localStorage
 * @returns {Object|null} The user object or null if not found
 */
export const getUser = () => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

/**
 * Set the user data in localStorage
 * @param {Object} user - The user object to store
 */
export const setUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting user:', error);
  }
};

/**
 * Handle login success
 * @param {string} token - The authentication token
 * @param {Object} user - The user object
 */
export const handleLoginSuccess = (token, user) => {
  setTokenWithExpiry(token);
  setUser(user);
};

/**
 * Handle logout
 */
export const handleLogout = () => {
  removeToken();
};

/**
 * Get auth header configuration for API requests
 * @returns {Object} Headers configuration object
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return getApiAuthHeaders(token);
}; 