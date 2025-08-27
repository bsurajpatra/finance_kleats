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
              <div className="settle-table">
                <div className="settle-row settle-head">
                  <div>Date</div>
                  <div>Orders</div>
                  <div>Total Revenue</div>
                  <div>Net Payout</div>
                  <div>Payment Status</div>
                </div>
                {settlements.map(r => (
                  <div key={r.order_date} className="settle-row">
                    <div>{new Date(r.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div>{r.orders_count}</div>
                    <div>₹ {Number(r.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div>₹ {Number(r.net_payout || r.payout_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div>
                      <button
                        className={`btn-primary`}
                        onClick={async () => {
                          try {
                            const dateIso = new Date(r.order_date).toISOString().slice(0,10)
                            const nextStatus = (r.status === 'settled') ? 'unsettled' : 'settled'
                            const res = await authFetch(API_ENDPOINTS.CANTEEN_SETTLEMENT_PAID(activeCanteen.CanteenId), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ date: dateIso, status: nextStatus })
                            })
                            if (!res.ok) throw new Error('Failed to update status')
                            setSettlements(prev => prev.map(row => (
                              row.order_date === r.order_date ? { ...row, status: nextStatus } : row
                            )))
                          } catch (err) {
                            console.error('Update payout status error:', err)
                            alert('Failed to update payout status')
                          }
                        }}
                      >{r.status === 'settled' ? 'Settled' : 'Unsettled'}</button>
                    </div>
                  </div>
                ))}
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