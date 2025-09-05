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
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = React.useRef(null);

  useEffect(() => {
    fetchGrossProfitData();
  }, [canteenId, startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilter(false);
      }
    }
    if (showFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilter]);

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
          <div className="transactions-filter-dropdown-wrapper" ref={filterRef}>
            <button
              className="transactions-filter-btn"
              onClick={() => setShowFilter(prev => !prev)}
            >
              Filter ▼
            </button>
            {showFilter && (
              <div className="transactions-filter-dropdown">
                <div className="filter-section">
                  <label>
                    Sort by:
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value)}
                      style={{ marginLeft: '0.5rem', marginRight: '1rem' }}
                    >
                      <option value="desc">Descending date</option>
                      <option value="asc">Ascending date</option>
                    </select>
                  </label>
                </div>
                <div className="filter-section">
                  <label>
                    Period:
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={{ marginLeft: '0.5rem' }}
                    />
                    <span style={{ margin: '0 0.5rem' }}>to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </label>
                </div>
                <div className="filter-section">
                  <button
                    className="clear-filters-btn"
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Filters moved to header dropdown; removed inline filters-section */}

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

      {/* Charts Section */}
      {sortedData.length > 0 && (
        <div className="profit-charts">
          {/* Daily chart */}
          <div className="chart-card">
            <div className="chart-title">Daily Gross Profit</div>
            {(() => {
              const chartData = sortedData
                .slice()
                .sort((a,b) => new Date(a.order_date) - new Date(b.order_date))
                .map(r => ({
                  label: new Date(r.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                  value: Number(r.gross_profit || 0)
                }));
              const maxVal = Math.max(1, ...chartData.map(d => Math.abs(d.value)));
              return (
                <div className="bars">
                  {chartData.map((d, idx) => {
                    const raw = Math.abs(Number(d.value ?? 0));
                    const pct = Math.round((raw / maxVal) * 100);
                    const heightPct = Math.max(2, pct); // ensure at least a small bar even for zero
                    return (
                      <div key={idx} className="bar">
                        <div
                          className={`bar-fill ${d.value >= 0 ? 'bar-positive' : 'bar-negative'}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${formatAmount(d.value)}`}
                        />
                        <div className="bar-label">{d.label}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Monthly chart */}
          <div className="chart-card">
            <div className="chart-title">Monthly Gross Profit</div>
            {(() => {
              const monthMap = new Map();
              for (const r of sortedData) {
                const dt = new Date(r.order_date);
                const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
                const prev = monthMap.get(key) || 0;
                monthMap.set(key, prev + Number(r.gross_profit || 0));
              }
              const chartData = Array.from(monthMap.entries())
                .sort((a,b) => new Date(a[0]+'-01') - new Date(b[0]+'-01'))
                .map(([key, sum]) => ({
                  label: new Date(key+'-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                  value: Number(sum || 0)
                }));
              const maxVal = Math.max(1, ...chartData.map(d => Math.abs(d.value)));
              return (
                <div className="bars">
                  {chartData.map((d, idx) => {
                    const raw = Math.abs(Number(d.value ?? 0));
                    const pct = Math.round((raw / maxVal) * 100);
                    const heightPct = Math.max(2, pct);
                    return (
                      <div key={idx} className="bar">
                        <div
                          className={`bar-fill ${d.value >= 0 ? 'bar-positive' : 'bar-negative'}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${formatAmount(d.value)}`}
                        />
                        <div className="bar-label">{d.label}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profit;
