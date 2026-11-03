/**
 * Centralized Backend API Configuration
 * 
 * Add or change your backend URL here:
 */
export const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  'https://ai-hr-dashboard-brynex-testenv.onrender.com';

// Clean base URL without trailing slash
export const API_BASE_URL = BACKEND_URL.replace(/\/+$/, '');

/**
 * Helper function to generate full API URLs.
 * Example:
 *   apiUrl('/api/hr/analysis')
 *   => "https://ai-hr-dashboard-brynex-testenv.onrender.com/api/hr/analysis"
 */
export const apiUrl = (endpoint = '') => {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Drop-in replacement for standard fetch() that automatically prepends your Backend URL
 * Example:
 *   const res = await apiFetch('/api/hr/analysis');
 */
export const apiFetch = (endpoint, options = {}) => {
  return fetch(apiUrl(endpoint), options);
};

export default {
  BACKEND_URL,
  API_BASE_URL,
  apiUrl,
  apiFetch
};

