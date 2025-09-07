import React, { useEffect, useMemo, useState } from 'react';
import './CanteenPaymentManagement.css';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';

const CanteenPaymentManagement = ({ onNavVisibilityChange, onEnterSettlements, onExitSettlements }) => {
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await authFetch(API_ENDPOINTS.CANTEENS);
        if (!res.ok) throw new Error('Failed to fetch canteens');
        const data = await res.json();
        setCanteens(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError('Failed to load canteens');
        console.error('Canteens fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const imagesMap = useMemo(() => {
    const modules = import.meta.glob('../../assets/*', { eager: true, as: 'url' });
    const map = new Map();
    Object.keys(modules).forEach((key) => {
      const file = key.split('/').pop() || '';
      const base = file.replace(/\.[^.]+$/, '');
      map.set(base.toLowerCase().replace(/[^a-z0-9]/g, ''), modules[key]);
    });
    return map;
  }, []);

  const getCanteenImage = (canteen) => {
    if (!canteen) return null;
    // Direct id-based overrides
    if (String(canteen.CanteenId) === '2') {
      try {
        return new URL('../../assets/naturals.jpeg', import.meta.url).toString();
      } catch (_) {
        // fall through to name-based resolution
      }
    }
    // Name-based resolution
    const normalized = String(canteen.CanteenName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return imagesMap.get(normalized) || null;
  };

  const toPascalCase = (value) => {
    if (!value) return '';
    return String(value)
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const [activeCanteen, setActiveCanteen] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [chartKey, setChartKey] = useState(0); // Force chart re-render
  const itemsPerPage = 20;
  
  // Filter states
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'settled', 'unsettled'
    month: 'all', // 'all', '2025-01', '2025-02', etc.
    startDate: '',
    endDate: ''
  });
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = React.useRef(null);

  const openSettlements = async (canteen) => {
    try {
      setActiveCanteen(canteen);
      setSettleLoading(true);
      setSettlements([]);
      setSettleError(null);
      onNavVisibilityChange && onNavVisibilityChange(true);
      onEnterSettlements && onEnterSettlements({
        title: `${toPascalCase(canteen.CanteenName)} - Settlements`,
        onBack: () => closeSettlements()
      });
      const sp = new URLSearchParams(window.location.search);
      sp.set('view', 'settlements');
      sp.set('canteenId', String(canteen.CanteenId));
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
      const res = await authFetch(API_ENDPOINTS.CANTEEN_SETTLEMENTS(canteen.CanteenId));
      if (!res.ok) throw new Error('Failed to fetch settlements');
      const data = await res.json();
      setSettlements(Array.isArray(data) ? data : []);
    } catch (err) {
      setSettleError('Failed to load settlements');
      console.error('Settlements fetch error:', err);
    } finally {
      setSettleLoading(false);
    }
  };

  const closeSettlements = () => {
    setActiveCanteen(null);
    setSettlements([]);
    setSettleError(null);
    setCurrentPage(1);
    // Reset filters when closing settlements
    setFilters({
      status: 'all',
      month: 'all',
      startDate: '',
      endDate: ''
    });
    onNavVisibilityChange && onNavVisibilityChange(false);
    onExitSettlements && onExitSettlements();
    const sp = new URLSearchParams(window.location.search);
    sp.delete('view');
    sp.delete('canteenId');
    window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
  };

  // Filter logic
  const getFilteredSettlements = () => {
    return settlements.filter(settlement => {
      // Status filter
      if (filters.status !== 'all') {
        const isSettled = settlement.status === 'settled';
        if (filters.status === 'settled' && !isSettled) return false;
        if (filters.status === 'unsettled' && isSettled) return false;
      }

      // Month filter
      if (filters.month !== 'all') {
        const settlementMonth = settlement.order_date.substring(0, 7); // YYYY-MM
        if (settlementMonth !== filters.month) return false;
      }

      // Date range filter
      if (filters.startDate) {
        if (settlement.order_date < filters.startDate) return false;
      }
      if (filters.endDate) {
        if (settlement.order_date > filters.endDate) return false;
      }

      return true;
    });
  };

  // Get available months from settlements data
  const getAvailableMonths = () => {
    const months = new Set();
    settlements.forEach(settlement => {
      const month = settlement.order_date.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    return Array.from(months).sort().reverse(); // Most recent first
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: 'all',
      month: 'all',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.status !== 'all' || 
           filters.month !== 'all' || 
           filters.startDate !== '' || 
           filters.endDate !== '';
  };

  // Auto-open settlements if query present
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const view = sp.get('view');
    const cid = sp.get('canteenId');
    if (view === 'settlements' && cid && canteens.length > 0 && !activeCanteen) {
      const found = canteens.find(c => String(c.CanteenId) === String(cid));
      if (found) {
        openSettlements(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canteens]);

  // Force chart re-render when settlements change
  useEffect(() => {
    if (settlements.length > 0) {
      setChartKey(prev => prev + 1);
    }
  }, [settlements]);

  // Handle click outside filter dropdown
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilter]);

  return (
    <div className="canteen-container">
      {!activeCanteen && (
        <div className="canteen-header">
          <h2>Canteen Payment Management</h2>
        </div>
      )}

      {activeCanteen ? (
        <div className="settle-page">
          <div className="settle-page-content">
            {settleLoading ? (
              <div className="settle-loading">Loading...</div>
            ) : settleError ? (
              <div className="settle-error">{settleError}</div>
            ) : settlements.length === 0 ? (
              <div className="settle-empty">No confirmed orders found.</div>
            ) : (
              <div className="settle-content">
                <div className="settle-table">
                  {(() => {
                    const filteredSettlements = getFilteredSettlements();
                    const totalDue = filteredSettlements
                      .filter(r => (r.status || 'unsettled') !== 'settled')
                      .reduce((sum, r) => sum + Number(r.net_payout || r.payout_amount || 0), 0)
                    return (
                      <div className="settle-summary" role="region" aria-label="Total payouts due">
                        <div className="settle-summary-label">
                          Total Payouts Due {hasActiveFilters() ? '(Filtered)' : ''}
                        </div>
                        <div className="settle-summary-value">₹ {Number(totalDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        {hasActiveFilters() && (
                          <div className="filter-info">
                            Showing {filteredSettlements.length} of {settlements.length} settlements
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  
                  {/* Filter Section - Separate from summary */}
                  <div className="settle-filters-section">
                    <div className="settle-filters" ref={filterRef}>
                      <div className="filter-header">
                        <button
                          className={`filter-toggle-btn ${hasActiveFilters() ? 'active' : ''}`}
                          onClick={() => setShowFilter(!showFilter)}
                        >
                          <span>🔍 Filters</span>
                          {hasActiveFilters() && <span className="filter-badge">●</span>}
                        </button>
                        {hasActiveFilters() && (
                          <button className="clear-filters-btn" onClick={clearFilters}>
                            Clear All
                          </button>
                        )}
                      </div>
                      
                      {showFilter && (
                        <div className="filter-dropdown">
                          <div className="filter-section">
                            <label>Status:</label>
                            <select
                              value={filters.status}
                              onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                              <option value="all">All Status</option>
                              <option value="settled">Settled Only</option>
                              <option value="unsettled">Unsettled Only</option>
                            </select>
                          </div>
                          
                          <div className="filter-section">
                            <label>Month:</label>
                            <select
                              value={filters.month}
                              onChange={(e) => handleFilterChange('month', e.target.value)}
                            >
                              <option value="all">All Months</option>
                              {getAvailableMonths().map(month => (
                                <option key={month} value={month}>
                                  {new Date(month + '-01').toLocaleDateString('en-IN', { 
                                    year: 'numeric', 
                                    month: 'long' 
                                  })}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="filter-section">
                            <label>Date Range:</label>
                            <div className="date-range-inputs">
                              <input
                                type="date"
                                placeholder="Start Date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                              />
                              <span>to</span>
                              <input
                                type="date"
                                placeholder="End Date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="settle-row settle-head">
                    <div>S.No.</div>
                    <div>Date</div>
                    <div>Orders</div>
                    <div>Total Revenue</div>
                    <div>Total Orders</div>
                    <div>Net Payout</div>
                    <div>Payment Status</div>
                    <div>Settled At</div>
                  </div>
                  {getFilteredSettlements()
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((r, index) => (
                    <div key={r.order_date} className="settle-row">
                      <div>{(currentPage - 1) * itemsPerPage + index + 1}</div>
                      <div>{(() => {
                        // order_date is already in YYYY-MM-DD format from the backend
                        const [year, month, day] = r.order_date.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return `${day} ${months[parseInt(month) - 1]} ${year}`;
                      })()}</div>
                      <div>{r.orders_count}</div>
                      <div>₹ {Number(r.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>₹ {Number(r.total_orders || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>₹ {Number(r.net_payout || r.payout_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div>
                        {r.status === 'settled' ? (
                          <div className="btn-status-settled-disabled" title={`Settled on ${r.settled_at ? new Date(r.settled_at).toLocaleDateString('en-IN') : 'Unknown date'}`}>
                            <span className="status-icon">✅</span>
                            <span>Settled</span>
                          </div>
                        ) : (
                          <button
                            className="btn-primary btn-status-unsettled"
                            onClick={async () => {
                              try {
                                // order_date is already in YYYY-MM-DD format
                                const dateIso = r.order_date
                                const settlementDate = new Date().toISOString().slice(0,10) // Current date for settlement
                                
                                const res = await authFetch(API_ENDPOINTS.CANTEEN_SETTLEMENT_PAID(activeCanteen.CanteenId), {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    date: dateIso, 
                                    status: 'settled',
                                    settlementDate: settlementDate
                                  })
                                })
                                if (!res.ok) {
                                  const errorData = await res.json()
                                  throw new Error(errorData.message || 'Failed to update status')
                                }
                                const payload = await res.json()
                                const updated = payload?.payout
                                setSettlements(prev => prev.map(row => {
                                  if (row.order_date !== r.order_date) return row
                                  return {
                                    ...row,
                                    status: 'settled',
                                    settled_at: updated?.settled_at ?? row.settled_at
                                  }
                                }))
                                
                                // Refetch settlements to ensure data consistency
                                try {
                                  const refreshRes = await authFetch(API_ENDPOINTS.CANTEEN_SETTLEMENTS(activeCanteen.CanteenId));
                                  if (refreshRes.ok) {
                                    const refreshData = await refreshRes.json();
                                    setSettlements(Array.isArray(refreshData) ? refreshData : []);
                                  }
                                } catch (refreshErr) {
                                  console.warn('Failed to refresh settlements after settlement:', refreshErr);
                                }
                              } catch (err) {
                                console.error('Update payout status error:', err)
                                alert(`Failed to update payout status: ${err.message}`)
                              }
                            }}
                            title="Click to mark as settled"
                          >
                            <span className="status-icon">⏳</span>
                            <span>Settle</span>
                          </button>
                        )}
                      </div>
                      <div>{r.settled_at ? new Date(r.settled_at).toLocaleString('en-IN', { hour12: false }) : '—'}</div>
                    </div>
                  ))}
                  
                  {/* Pagination */}
                  {getFilteredSettlements().length > itemsPerPage && (
                    <div className="pagination-container">
                      <div className="pagination-info">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredSettlements().length)} of {getFilteredSettlements().length} settlements
                        {hasActiveFilters() && ` (${settlements.length} total)`}
                      </div>
                      <div className="pagination-controls">
                        <button 
                          className="pagination-btn"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                        <div className="page-numbers">
                          {(() => {
                            const filteredLength = getFilteredSettlements().length;
                            const totalPages = Math.ceil(filteredLength / itemsPerPage);
                            const startPage = Math.max(1, currentPage - 2);
                            const endPage = Math.min(totalPages, currentPage + 2);
                            const pages = [];
                            
                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(i);
                            }
                            
                            return pages.map(page => (
                              <button
                                key={page}
                                className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            ));
                          })()}
                        </div>
                        <button 
                          className="pagination-btn"
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(getFilteredSettlements().length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(getFilteredSettlements().length / itemsPerPage)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Spacer between table and charts */}
                <div className="chart-spacer"></div>
                
                <div className="chart-section" key={chartKey}>
                  <div className="chart-card">
                    <div className="chart-title">Daily Net Payouts</div>
                    {(() => {
                      const data = getFilteredSettlements()
                        .slice()
                        .sort((a,b) => new Date(a.order_date) - new Date(b.order_date))
                        .map(r => {
                          const amount = Number(r.net_payout || r.payout_amount || 0)
                          const isSettled = (r.status === 'settled')
                          return {
                            dateLabel: new Date(r.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                            value: amount,
                            settled: isSettled,
                            orderDate: r.order_date, // Add original date for stable key
                          }
                        })
                        const maxVal = Math.max(1, ...data.map(d => d.value))
                        const maxRange = Math.ceil(maxVal / 500) * 500 // Round up to nearest 500
                        const yAxisSteps = Math.ceil(maxRange / 500) // Number of 500 increments
                        
                        return (
                          <div className="horizontal-chart">
                            {/* Y-axis labels (amount range) */}
                            <div className="y-axis-labels">
                              {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
                                <div key={i} className="y-axis-label">
                                  ₹{((yAxisSteps - i) * 500).toLocaleString('en-IN')}
                                </div>
                              ))}
                            </div>
                            
                            {/* Chart area */}
                            <div className="chart-area">
                              {/* Y-axis grid lines */}
                              <div className="y-axis-grid">
                                {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
                                  <div key={i} className="grid-line" style={{ bottom: `${((yAxisSteps - i) / yAxisSteps) * 100}%` }}></div>
                                ))}
                              </div>
                              
                              {/* Data bars */}
                              <div className="horizontal-bars">
                                {data.map((d) => {
                                  const heightPct = Math.round((d.value / maxRange) * 100)
                                  return (
                                    <div key={d.orderDate} className="horizontal-bar">
                                      <div className="date-label">{d.dateLabel}</div>
                                      <div className="bar-container">
                                        <div 
                                          className={`horizontal-bar-fill ${d.settled ? 'bar-fill-settled' : 'bar-fill-unsettled'}`} 
                                          style={{ height: `${heightPct}%` }} 
                                          title={`₹ ${d.value.toLocaleString('en-IN')} - ${d.settled ? 'Settled' : 'Unsettled'}`}
                                        ></div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                    })()}
                  </div>
                </div>
                
                {/* Spacer between daily and monthly charts */}
                <div className="chart-spacer"></div>
                
                {/* Monthly Chart Section */}
                <div className="chart-section" key={`${chartKey}-monthly`}>
                  <div className="chart-card">
                    <div className="chart-title">Monthly Net Payouts</div>
                    {(() => {
                      // Group data by month
                      const monthlyData = new Map();
                      getFilteredSettlements().forEach(settlement => {
                        const month = settlement.order_date.substring(0, 7); // YYYY-MM
                        const amount = Number(settlement.net_payout || settlement.payout_amount || 0);
                        const isSettled = settlement.status === 'settled';
                        
                        if (!monthlyData.has(month)) {
                          monthlyData.set(month, { total: 0, settled: 0, unsettled: 0 });
                        }
                        
                        const monthData = monthlyData.get(month);
                        monthData.total += amount;
                        if (isSettled) {
                          monthData.settled += amount;
                        } else {
                          monthData.unsettled += amount;
                        }
                      });
                      
                      // Convert to array and sort by month
                      const data = Array.from(monthlyData.entries())
                        .map(([month, data]) => ({
                          monthLabel: new Date(month + '-01').toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'short' 
                          }),
                          total: data.total,
                          settled: data.settled,
                          unsettled: data.unsettled,
                          monthKey: month
                        }))
                        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
                      
                      const maxVal = Math.max(1, ...data.map(d => d.total));
                      const maxRange = Math.ceil(maxVal / 1000) * 1000; // Round up to nearest 1000
                      const yAxisSteps = Math.ceil(maxRange / 1000); // Number of 1000 increments
                      
                      return (
                        <div className="horizontal-chart">
                          {/* Y-axis labels (amount range) */}
                          <div className="y-axis-labels">
                            {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
                              <div key={i} className="y-axis-label">
                                ₹{((yAxisSteps - i) * 1000).toLocaleString('en-IN')}
                              </div>
                            ))}
                          </div>
                          
                          {/* Chart area */}
                          <div className="chart-area">
                            {/* Y-axis grid lines */}
                            <div className="y-axis-grid">
                              {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
                                <div key={i} className="grid-line" style={{ bottom: `${((yAxisSteps - i) / yAxisSteps) * 100}%` }}></div>
                              ))}
                            </div>
                            
                            {/* Data bars */}
                            <div className="horizontal-bars">
                              {data.map((d) => {
                                const totalHeightPct = Math.round((d.total / maxRange) * 100);
                                const settledHeightPct = d.total > 0 ? Math.round((d.settled / d.total) * totalHeightPct) : 0;
                                
                                return (
                                  <div key={d.monthKey} className="horizontal-bar">
                                    <div className="date-label">{d.monthLabel}</div>
                                    <div className="bar-container">
                                      <div 
                                        className="horizontal-bar-fill bar-fill-settled" 
                                        style={{ height: `${settledHeightPct}%` }} 
                                        title={`Settled: ₹${d.settled.toLocaleString('en-IN')}`}
                                      ></div>
                                      <div 
                                        className="horizontal-bar-fill bar-fill-unsettled" 
                                        style={{ height: `${totalHeightPct - settledHeightPct}%` }} 
                                        title={`Unsettled: ₹${d.unsettled.toLocaleString('en-IN')}`}
                                      ></div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        loading ? (
          <div className="canteen-placeholder">
            <p>Loading canteens...</p>
          </div>
        ) : error ? (
          <div className="canteen-placeholder">
            <p>{error}</p>
          </div>
        ) : canteens.length === 0 ? (
          <div className="canteen-placeholder">
            <p>No canteens found.</p>
          </div>
        ) : (
          <div className="canteen-grid">
            {canteens.map(c => {
              const imgSrc = getCanteenImage(c);
              return (
              <div key={c.CanteenId} className="canteen-card">
                <div className="canteen-media">
                  {imgSrc ? (
                    <img src={imgSrc} alt={c.CanteenName} className="canteen-banner" />
                  ) : (
                    <div className="canteen-banner placeholder-banner">{(c.CanteenName || 'C')[0]}</div>
                  )}
                </div>
                <div className="canteen-footer">
                  <div className="canteen-info">
                    <div className="canteen-name">{toPascalCase(c.CanteenName)}</div>
                    <div className="canteen-location">{toPascalCase(c.Location) || '—'}</div>
                  </div>
                  <div className="canteen-actions">
                    <button className="btn-primary" onClick={() => openSettlements(c)}>Settle Payments</button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )
      )}

      
    </div>
  );
};

export default CanteenPaymentManagement; 