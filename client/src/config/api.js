// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;

export const API_ENDPOINTS = {
  TRANSACTIONS: `${API_BASE_URL}/api/transactions`,
  HEALTH: `${API_BASE_URL}/health`,
};

export default API_BASE_URL; 