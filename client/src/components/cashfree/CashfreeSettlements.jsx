import React, { useEffect, useState } from 'react';
import './CashfreeSettlements.css';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';

const CashfreeSettlements = () => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: ''
  });
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = React.useRef(null);
  const [pagination, setPagination] = useState({
    limit: 50,
    cursor: null
  });

  const fetchSettlements = async (useFilters = false) => {
    try {
      setLoading(true);
      setError(null);

      let url = API_ENDPOINTS.CASHFREE_SETTLEMENTS_ALL;
      const params = new URLSearchParams();

      if (useFilters && filters.start_date && filters.end_date) {
        url = API_ENDPOINTS.CASHFREE_SETTLEMENTS_BY_DATE(filters.start_date, filters.end_date);
      } else if (useFilters) {
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (pagination.limit) params.append('limit', pagination.limit);
        if (pagination.cursor) params.append('cursor', pagination.cursor);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }

      const response = await authFetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch settlements: ${response.status}`);
      }

      const data = await response.json();
      setSettlements(data.data || []);
      
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          cursor: data.pagination.cursor
        }));
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching settlements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

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

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = () => {
    fetchSettlements(true);
  };

  const handleClearFilters = () => {
    setFilters({ start_date: '', end_date: '' });
    setPagination({ limit: 50, cursor: null });
    fetchSettlements();
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="cashfree-settlements">
      <div className="settlements-header">
        <h2>Cashfree Settlements</h2>
        <div className="settlements-actions">
          <div className="filter-dropdown-wrapper" ref={filterRef}>
            <button
              className="filter-btn"
              onClick={() => setShowFilter(prev => !prev)}
            >
              Filter ▼
            </button>
            {showFilter && (
              <div className="filter-dropdown">
                <div className="filter-section">
                  <label htmlFor="cf-start">Start date:</label>
                  <input
                    id="cf-start"
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  />
                </div>
                <div className="filter-section">
                  <label htmlFor="cf-end">End date:</label>
                  <input
                    id="cf-end"
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  />
                </div>
                <div className="filter-section">
                  <div className="filter-actions">
                    <button className="btn-apply" onClick={handleApplyFilters}>Apply</button>
                    <button className="btn-clear" onClick={handleClearFilters}>Clear</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button 
            className="btn-refresh" 
            onClick={() => fetchSettlements(true)}
            disabled={loading}
            aria-label="Refresh"
            title={loading ? 'Loading…' : 'Refresh'}
          >
            {loading ? '⏳' : '↻'}
          </button>
        </div>
      </div>

      {/* Filters moved into dropdown in header */}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Settlements Table */}
      {loading ? (
        <div className="loading">Loading settlements...</div>
      ) : settlements.length === 0 ? (
        <div className="no-data">No settlements found.</div>
      ) : (
        <div className="settlements-table-container">
          <div className="settlements-summary">
            <p>Total Settlements: {settlements.length}</p>
            <p>Total Amount Settled: {formatCurrency(
              settlements.reduce((sum, s) => sum + (Number(s.amount_settled || 0)), 0)
            )}</p>
          </div>
          
          <div className="settlements-table">
            <div className="table-header">
              <div className="col-amount">Amount Settled</div>
              <div className="col-from">Payment From</div>
              <div className="col-till">Payment Till</div>
            </div>
            
            {settlements.map((settlement, index) => (
              <div key={index} className="table-row">
                <div className="settlement-amount col-amount">{formatCurrency(Number(settlement.amount_settled || 0))}</div>
                <div className="payment-time col-from">{settlement.payment_from ? formatDate(settlement.payment_from) : '—'}</div>
                <div className="payment-time col-till">{settlement.payment_till ? formatDate(settlement.payment_till) : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CashfreeSettlements;
