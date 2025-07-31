import React, { useEffect, useState, useRef } from 'react';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';
import './Payouts.css';

const Payouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayouts, setSelectedPayouts] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [payoutsPerPage] = useState(20);
  const [sortOrder, setSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const filterRef = useRef(null);

  useEffect(() => {
    fetchPayouts();
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilter]);

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
      console.error('Error fetching payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  // Filter and sort payouts
  const filteredAndSortedPayouts = payouts
    .filter(payout => {
      const payoutDate = new Date(payout.date);
      const afterStart = !startDate || payoutDate >= new Date(startDate);
      const beforeEnd = !endDate || payoutDate <= new Date(endDate);
      return afterStart && beforeEnd;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  // Pagination logic
  const indexOfLastPayout = currentPage * payoutsPerPage;
  const indexOfFirstPayout = indexOfLastPayout - payoutsPerPage;
  const currentPayouts = filteredAndSortedPayouts.slice(indexOfFirstPayout, indexOfLastPayout);
  const totalPages = Math.ceil(filteredAndSortedPayouts.length / payoutsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPayouts(currentPayouts.map(payout => payout.id));
    } else {
      setSelectedPayouts([]);
    }
  };

  const handleSelectPayout = (payoutId) => {
    setSelectedPayouts(prev => {
      if (prev.includes(payoutId)) {
        return prev.filter(id => id !== payoutId);
      } else {
        return [...prev, payoutId];
      }
    });
  };

  const handleBulkDeleteClick = () => {
    if (selectedPayouts.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedPayouts.length === 0) return;
    
    const originalPayouts = [...payouts];
    
    try {
      // Optimistic update - remove from UI immediately
      setPayouts(prev => prev.filter(payout => !selectedPayouts.includes(payout.id)));
      setShowBulkDeleteModal(false);
      setSelectedPayouts([]);
      
      const token = localStorage.getItem('token');
      
      // Delete payouts one by one (could be optimized with a bulk endpoint)
      for (const payoutId of selectedPayouts) {
        const response = await fetch(`${API_ENDPOINTS.PAYOUTS}/${payoutId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to delete payout ${payoutId}: ${errorData.error || 'Unknown error'}`);
        }
      }
      
      // Refresh data
      setTimeout(() => {
        fetchPayouts();
      }, 100);
      
    } catch (err) {
      console.error('Error bulk deleting payouts:', err);
      
      // Revert optimistic update on error
      setPayouts(originalPayouts);
      alert(`Failed to delete payouts: ${err.message}`);
    }
  };

  const handleCancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
  };

  // Pagination handlers
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedPayouts([]); // Clear selections when changing pages
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    goToPage(1);
  };

  const goToLastPage = () => {
    goToPage(totalPages);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, startDate, endDate]);

  if (loading) {
    return (
      <div className="payouts-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading payouts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payouts-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchPayouts} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payouts-container">
      <div className="payouts-header">
        <h2>All Payouts</h2>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {selectedPayouts.length > 0 && (
            <button
              className="bulk-delete-btn"
              onClick={handleBulkDeleteClick}
              style={{ marginRight: '1rem' }}
            >
              Delete Selected ({selectedPayouts.length})
            </button>
          )}
          <div className="payouts-filter-dropdown-wrapper" ref={filterRef}>
            <button
              className="payouts-filter-btn"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              Filter &#x25BC;
            </button>
            {showFilter && (
              <div className="payouts-filter-dropdown">
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
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSortOrder('desc');
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBulkDeleteModal && (
        <div className="payouts-modal-backdrop">
          <div className="payouts-modal delete-modal">
            <h3>Delete Multiple Payouts</h3>
            <div className="delete-confirmation">
              <p>Are you sure you want to delete {selectedPayouts.length} selected payout(s)?</p>
              <div className="payout-preview">
                <p><strong>Selected Payouts:</strong></p>
                <div className="selected-payouts-list">
                  {payouts
                    .filter(payout => selectedPayouts.includes(payout.id))
                    .slice(0, 5) // Show first 5 for preview
                    .map(payout => (
                      <div key={payout.id} className="selected-payout-item">
                        <span>{formatDate(payout.date)}</span>
                        <span>{formatAmount(payout.funds_released)}</span>
                      </div>
                    ))}
                  {selectedPayouts.length > 5 && (
                    <div className="more-payouts">
                      ... and {selectedPayouts.length - 5} more
                    </div>
                  )}
                </div>
              </div>
              <p className="warning-text">⚠️ This action cannot be undone.</p>
            </div>
            <div className="payouts-modal-actions">
              <button 
                onClick={handleConfirmBulkDelete} 
                className="delete-btn"
              >
                Delete All
              </button>
              <button 
                onClick={handleCancelBulkDelete} 
                className="payouts-modal-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredAndSortedPayouts.length === 0 ? (
        <div className="no-payouts">
          <p>No payouts found.</p>
        </div>
      ) : (
        <>
          <div className="payouts-table-container">
            <table className="payouts-table">
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedPayouts.length === currentPayouts.length && currentPayouts.length > 0}
                      ref={input => {
                        if (input) {
                          input.indeterminate = selectedPayouts.length > 0 && selectedPayouts.length < currentPayouts.length;
                        }
                      }}
                    />
                  </th>
                  <th>S.No.</th>
                  <th>Date</th>
                  <th>Funds Released</th>
                </tr>
              </thead>
              <tbody>
                {currentPayouts.map((payout, index) => (
                  <tr key={payout.id} className="payout-row">
                    <td className="checkbox-cell">
                      <input 
                        type="checkbox" 
                        checked={selectedPayouts.includes(payout.id)}
                        onChange={() => handleSelectPayout(payout.id)}
                      />
                    </td>
                    <td className="serial-number">{indexOfFirstPayout + index + 1}</td>
                    <td className="payout-date">{formatDate(payout.date)}</td>
                    <td className="funds-released">{formatAmount(payout.funds_released)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-info">
                <span>
                  Showing {indexOfFirstPayout + 1} to {Math.min(indexOfLastPayout, filteredAndSortedPayouts.length)} of {filteredAndSortedPayouts.length} payouts
                </span>
              </div>
              <div className="pagination-controls">
                <button 
                  className="pagination-btn"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                >
                  « First
                </button>
                <button 
                  className="pagination-btn"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  ‹ Previous
                </button>
                
                {getPageNumbers().map((pageNumber, index) => (
                  <button
                    key={index}
                    className={`pagination-btn ${pageNumber === currentPage ? 'active' : ''} ${pageNumber === '...' ? 'disabled' : ''}`}
                    onClick={() => typeof pageNumber === 'number' && goToPage(pageNumber)}
                    disabled={pageNumber === '...'}
                  >
                    {pageNumber}
                  </button>
                ))}
                
                <button 
                  className="pagination-btn"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next ›
                </button>
                <button 
                  className="pagination-btn"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                >
                  Last »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="payouts-summary">
        <p>Total Payouts: {filteredAndSortedPayouts.length}</p>
        <p>Total Amount Released: {formatAmount(filteredAndSortedPayouts.reduce((sum, payout) => sum + Number(payout.funds_released), 0))}</p>
      </div>
    </div>
  );
};

export default Payouts;