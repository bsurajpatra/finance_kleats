const API_BASE_URL = import.meta.env.VITE_API_URL;

export const API_ENDPOINTS = {
  TRANSACTIONS: `${API_BASE_URL}/api/transactions`,
  HEALTH: `${API_BASE_URL}/health`,
  PAYOUTS: `${API_BASE_URL}/api/payouts`,
};

export default API_BASE_URL;

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`,
    },
  });
} 