import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';
import './Profit.css';

const Profit = ({ canteenId = null }) => {
  const [grossProfitData, setGrossProfitData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first

  useEffect(() => {
    fetchGrossProfitData();
  }, [canteenId, startDate, endDate]);

  const fetchGrossProfitData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build URL with query parameters
      let url = API_ENDPOINTS.PROFIT(canteenId || 'all');
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await authFetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch gross profit data');
      }
      
      const data = await response.json();
      setGrossProfitData(data);
    } catch (err) {
      setError('Failed to load gross profit data. Please try again later.');
      console.error('Error fetching gross profit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSortToggle = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const sortedData = [...grossProfitData].sort((a, b) => {
    const dateA = new Date(a.order_date);
    const dateB = new Date(b.order_date);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const totalGrossProfit = sortedData.reduce((sum, item) => sum + Number(item.gross_profit), 0);

  if (loading) {
    return (
      <div className="net-profit-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading gross profit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="net-profit-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchGrossProfitData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="net-profit-container">
      <div className="net-profit-header">
        <h2>Daily Gross Profit Report</h2>
        <div className="header-actions">
          <button 
            className="sort-btn"
            onClick={handleSortToggle}
          >
            Sort by Date {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
          <button 
            className="net-profit-refresh-btn"
            onClick={fetchGrossProfitData}
            title="Refresh data"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="date-filters">
          <div className="filter-group">
            <label htmlFor="startDate">Start Date:</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="endDate">End Date:</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            className="clear-filters-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <h3>Total Gross Profit</h3>
          <div className="stat-value">{formatAmount(totalGrossProfit)}</div>
        </div>
        <div className="stat-card">
          <h3>Days with Data</h3>
          <div className="stat-value">{sortedData.length}</div>
        </div>
        <div className="stat-card">
          <h3>Average Daily Profit</h3>
          <div className="stat-value">
            {sortedData.length > 0 ? formatAmount(totalGrossProfit / sortedData.length) : formatAmount(0)}
          </div>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="no-data">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
              <path d="M12 6c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
            </svg>
          </div>
          <p>No gross profit data found for the selected period.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="net-profit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Gross Profit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr key={`${item.order_date}-${index}`} className="profit-row">
                  <td className="date-cell">
                    {formatDate(item.order_date)}
                  </td>
                  <td className={`profit-cell ${Number(item.gross_profit) >= 0 ? 'positive' : 'negative'}`}>
                    {formatAmount(item.gross_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Profit;
