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
    onNavVisibilityChange && onNavVisibilityChange(false);
    onExitSettlements && onExitSettlements();
    const sp = new URLSearchParams(window.location.search);
    sp.delete('view');
    sp.delete('canteenId');
    window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
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
                    const totalDue = settlements
                      .filter(r => (r.status || 'unsettled') !== 'settled')
                      .reduce((sum, r) => sum + Number(r.net_payout || r.payout_amount || 0), 0)
                    return (
                      <div className="settle-summary" role="region" aria-label="Total payouts due">
                        <div className="settle-summary-label">Total Payouts Due</div>
                        <div className="settle-summary-value">₹ {Number(totalDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      </div>
                    )
                  })()}
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
                  {settlements
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((r, index) => (
                    <div key={r.order_date} className="settle-row">
                      <div>{(currentPage - 1) * itemsPerPage + index + 1}</div>
                      <div>{new Date(r.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div>{r.orders_count}</div>
                      <div>₹ {Number(r.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>₹ {Number(r.total_orders || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>₹ {Number(r.net_payout || r.payout_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div>
                        <button
                          className={`btn-primary ${r.status === 'settled' ? 'btn-status-settled' : 'btn-status-unsettled'}`}
                          onClick={async () => {
                            try {
                              const dateIso = new Date(r.order_date).toISOString().slice(0,10)
                              const nextStatus = (r.status === 'settled') ? 'unsettled' : 'settled'
                              const settlementDate = new Date().toISOString().slice(0,10) // Current date for settlement
                              
                              const res = await authFetch(API_ENDPOINTS.CANTEEN_SETTLEMENT_PAID(activeCanteen.CanteenId), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  date: dateIso, 
                                  status: nextStatus,
                                  settlementDate: nextStatus === 'settled' ? settlementDate : undefined
                                })
                              })
                              if (!res.ok) throw new Error('Failed to update status')
                              const payload = await res.json()
                              const updated = payload?.payout
                              setSettlements(prev => prev.map(row => {
                                if (row.order_date !== r.order_date) return row
                                return {
                                  ...row,
                                  status: nextStatus,
                                  settled_at: nextStatus === 'unsettled' ? null : (updated?.settled_at ?? row.settled_at)
                                }
                              }))
                            } catch (err) {
                              console.error('Update payout status error:', err)
                              alert('Failed to update payout status')
                            }
                          }}
                        >{r.status === 'settled' ? 'Settled' : 'Unsettled'}</button>
                      </div>
                      <div>{r.settled_at ? new Date(r.settled_at).toLocaleString('en-IN', { hour12: false }) : '—'}</div>
                    </div>
                  ))}
                  
                  {/* Pagination */}
                  {settlements.length > itemsPerPage && (
                    <div className="pagination-container">
                      <div className="pagination-info">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, settlements.length)} of {settlements.length} settlements
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
                            const totalPages = Math.ceil(settlements.length / itemsPerPage);
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
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(settlements.length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(settlements.length / itemsPerPage)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="chart-section" key={chartKey}>
                  <div className="chart-card">
                    <div className="chart-title">Daily Net Payouts</div>
                    {(() => {
                      const data = settlements
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