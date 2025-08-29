const API_BASE_URL = import.meta.env.VITE_API_URL;

export const API_ENDPOINTS = {
  TRANSACTIONS: `${API_BASE_URL}/api/transactions`,
  HEALTH: `${API_BASE_URL}/health`,

  SUMMARY: `${API_BASE_URL}/api/summary`,
  NET_PROFIT: (canteenId) => `${API_BASE_URL}/api/summary/net-profit/${canteenId}`,
  CANTEENS: `${API_BASE_URL}/api/canteens`,
  CANTEEN_SETTLEMENTS: (id) => `${API_BASE_URL}/api/canteens/${id}/settlements`,
  CANTEEN_SETTLEMENT_PAID: (id) => `${API_BASE_URL}/api/canteens/${id}/settlements/paid`,
};

export default API_BASE_URL;

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    try {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { status: response.status } }));
    } catch (_) {
      // noop
    }
  }

  return response;
}