import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';
import './Payouts.css';

const Payouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API_ENDPOINTS.PAYOUTS);
      if (!response.ok) throw new Error('Failed to fetch payouts');
      const data = await response.json();
      setPayouts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load payouts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payouts-container">
      <h2>Payouts</h2>
      {loading ? (
        <div>Loading payouts...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : payouts.length === 0 ? (
        <div>No payouts found.</div>
      ) : (
        <table className="payouts-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Funds Released</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => (
              <tr key={payout.id}>
                <td>{payout.id}</td>
                <td>{new Date(payout.date).toLocaleDateString('en-IN')}</td>
                <td>{Number(payout.funds_released).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Payouts;