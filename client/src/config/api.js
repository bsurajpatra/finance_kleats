const API_BASE_URL = import.meta.env.VITE_API_URL;

export const API_ENDPOINTS = {
  TRANSACTIONS: `${API_BASE_URL}/api/transactions`,
  HEALTH: `${API_BASE_URL}/health`,

  SUMMARY: `${API_BASE_URL}/api/summary`,
  PROFIT: (canteenId) => `${API_BASE_URL}/api/summary/profit/${canteenId}`,
  CANTEENS: `${API_BASE_URL}/api/canteens`,
  CANTEEN_SETTLEMENTS: (id) => `${API_BASE_URL}/api/canteens/${id}/settlements`,
  CANTEEN_SETTLEMENT_PAID: (id) => `${API_BASE_URL}/api/canteens/${id}/settlements/paid`,
  
  // Cashfree API endpoints
  CASHFREE_SETTLEMENTS: `${API_BASE_URL}/api/cashfree/settlements`,
  CASHFREE_SETTLEMENTS_ALL: `${API_BASE_URL}/api/cashfree/settlements/all`,
  CASHFREE_SETTLEMENTS_BY_DATE: (startDate, endDate) => `${API_BASE_URL}/api/cashfree/settlements/${startDate}/${endDate}`,

  // Explore endpoints
  EXPLORE_REVENUE: (canteenId, start, end) => `${API_BASE_URL}/api/explore/canteen/${canteenId}/revenue?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  NET_PROFITS_BY_SETTLEMENTS: (canteenId, start, end) => {
    const base = `${API_BASE_URL}/api/explore/canteen/${canteenId}/net-profits`;
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  },
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