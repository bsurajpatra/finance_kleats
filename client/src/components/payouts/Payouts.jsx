import React, { useEffect, useState, useRef } from 'react';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';
import './Payouts.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    date: '',
    funds_released: ''
  });
  const [modalError, setModalError] = useState('');
  const [isAddingPayout, setIsAddingPayout] = useState(false);

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

  const handleCellDoubleClick = (rowId, field, value) => {
    setEditingCell({ rowId, field, value });
    setEditValue(value);
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    
    const originalPayouts = [...payouts];
    
    try {
      const token = localStorage.getItem('token');
      let updateData = { [editingCell.field]: editValue };
      
      if (editingCell.field === 'funds_released') {
        updateData = { funds_released: Number(editValue) || 0 };
      }
      
      setPayouts(prev => prev.map(payout => 
        payout.id === editingCell.rowId 
          ? { ...payout, ...updateData }
          : payout
      ));
      
      setEditingCell(null);
      setEditValue('');
      
      const response = await fetch(`${API_ENDPOINTS.PAYOUTS}/${editingCell.rowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payout');
      }
      
      setTimeout(() => {
        fetchPayouts();
      }, 100);
      
    } catch (err) {
      console.error('Error updating payout:', err);
      
      setPayouts(originalPayouts);
      
      alert(`Failed to update payout: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPayout = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!modalData.date || !modalData.funds_released) {
      setModalError('Date and funds released are required.');
      return;
    }
    
    const originalPayouts = [...payouts];
    
    try {
      setIsAddingPayout(true);
      const token = localStorage.getItem('token');
      const newPayoutData = {
        date: modalData.date,
        funds_released: Number(modalData.funds_released)
      };
      
             const tempPayout = {
         id: `temp-${Date.now()}`,
         date: newPayoutData.date,
         funds_released: newPayoutData.funds_released,
         isPending: true
       };
      
      setPayouts(prev => [...prev, tempPayout]);
      
      setShowModal(false);
      setModalData({ date: '', funds_released: '' });
      
      const res = await fetch(API_ENDPOINTS.PAYOUTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPayoutData)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add payout');
      }
      
      setPayouts(prev => prev.filter(payout => payout.id !== tempPayout.id));
      
      setTimeout(() => {
        fetchPayouts();
      }, 100);
      
    } catch (err) {
      console.error('Error adding payout:', err);
      
      setPayouts(originalPayouts);
      
      setShowModal(true);
      setModalError(err.message);
    } finally {
      setIsAddingPayout(false);
    }
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

  const exportToCSV = () => {
    if (filteredAndSortedPayouts.length === 0) return;
    const headers = [
      'S.No.',
      'Date',
      'Funds Released'
    ];
    const rows = filteredAndSortedPayouts.map((payout, idx) => [
      idx + 1,
      formatDate(payout.date),
      payout.funds_released
    ]);
    const csvContent =
      [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payouts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Bar Graph Data Preparation ---
  function getMonthYear(dateString) {
    const date = new Date(dateString);
    return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
  }

  // Aggregate payouts by month
  const payoutsByMonth = payouts.reduce((acc, payout) => {
    if (!payout.date) return acc;
    const monthYear = getMonthYear(payout.date);
    acc[monthYear] = (acc[monthYear] || 0) + Number(payout.funds_released || 0);
    return acc;
  }, {});

  // Sort months chronologically
  const sortedMonths = Object.keys(payoutsByMonth).sort((a, b) => {
    const [aMonth, aYear] = a.split(' ');
    const [bMonth, bYear] = b.split(' ');
    const aDate = new Date(`${aMonth} 1, ${aYear}`);
    const bDate = new Date(`${bMonth} 1, ${bYear}`);
    return aDate - bDate;
  });

  const barData = {
    labels: sortedMonths,
    datasets: [
      {
        label: 'Payout Amount (INR)',
        data: sortedMonths.map(month => payoutsByMonth[month]),
        backgroundColor: 'rgba(49, 130, 206, 0.7)',
        borderColor: 'rgba(49, 130, 206, 1)',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 40
      }
    ]
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Payouts by Month',
        font: { size: 18 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `₹${context.parsed.y.toLocaleString('en-IN')}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return `₹${value.toLocaleString('en-IN')}`;
          }
        }
      }
    }
  };

  // --- Payouts by Day Graph ---
  // Aggregate payouts by day (YYYY-MM-DD)
  const payoutsByDay = payouts.reduce((acc, payout) => {
    if (!payout.date) return acc;
    const day = new Date(payout.date).toISOString().slice(0, 10); // 'YYYY-MM-DD'
    acc[day] = (acc[day] || 0) + Number(payout.funds_released || 0);
    return acc;
  }, {});

  // Get last 30 days (sorted)
  const sortedDays = Object.keys(payoutsByDay)
    .sort((a, b) => new Date(a) - new Date(b))
    .slice(-30);

  const barDataDay = {
    labels: sortedDays,
    datasets: [
      {
        label: 'Payout Amount (INR)',
        data: sortedDays.map(day => payoutsByDay[day]),
        backgroundColor: 'rgba(72, 187, 120, 0.7)',
        borderColor: 'rgba(72, 187, 120, 1)',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 24
      }
    ]
  };

  const barOptionsDay = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Payouts by Day (Last 30 Days)',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `₹${context.parsed.y.toLocaleString('en-IN')}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          callback: function(value, index, ticks) {
            // Show only every 2nd or 3rd label for readability
            return (index % 2 === 0) ? this.getLabelForValue(value) : '';
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return `₹${value.toLocaleString('en-IN')}`;
          }
        }
      }
    }
  };

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
      <div className="payouts-main-content">
        <div className="payouts-table-side">
          <div className="payouts-table-header">
            <div className="payouts-header">
      <h2>Payouts</h2>
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
                <button
                  className="payouts-new-btn"
                  onClick={() => setShowModal(true)}
                >
                  New
                </button>
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
                <button
                  className="payouts-export-btn"
                  onClick={exportToCSV}
                  style={{ marginLeft: '1rem' }}
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
          <div className="payouts-table-content">
            {/* Modals */}
            {showModal && (
              <div className="payouts-modal-backdrop">
                <div className="payouts-modal">
                  <h3>Add New Payout</h3>
                  <form onSubmit={handleAddPayout} className="payouts-modal-form">
                    <label>
                      Date:
                      <input 
                        type="date" 
                        name="date" 
                        value={modalData.date} 
                        onChange={handleModalChange} 
                        required 
                      />
                    </label>
                    <label>
                      Funds Released:
                      <input 
                        type="number" 
                        name="funds_released" 
                        value={modalData.funds_released} 
                        onChange={handleModalChange} 
                        min="0.01" 
                        step="0.01" 
                        required 
                      />
                    </label>
                    {modalError && <div className="payouts-modal-error">{modalError}</div>}
                    <div className="payouts-modal-actions">
                      <button 
                        type="submit" 
                        className="payouts-modal-submit"
                        disabled={isAddingPayout}
                      >
                        {isAddingPayout ? 'Adding...' : 'Add'}
                      </button>
                      <button 
                        type="button" 
                        className="payouts-modal-cancel" 
                        onClick={() => setShowModal(false)}
                        disabled={isAddingPayout}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

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
                          .slice(0, 5)
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

            {/* Table and Pagination */}
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
                      {currentPayouts.map((payout, index) => {
                        const isEditing = editingCell?.rowId === payout.id;
                        const isPending = payout.isPending;
                        return (
                          <React.Fragment key={payout.id}>
                            <tr className={`payout-row ${isPending ? 'pending-payout' : ''}`}>
                              <td className="checkbox-cell">
                                <input 
                                  type="checkbox" 
                                  checked={selectedPayouts.includes(payout.id)}
                                  onChange={() => handleSelectPayout(payout.id)}
                                />
                              </td>
                              <td className="serial-number">{indexOfFirstPayout + index + 1}</td>
                              <td 
                                className="payout-date editable-cell"
                                onDoubleClick={() => !isPending && handleCellDoubleClick(payout.id, 'date', payout.date)}
                              >
                                {isEditing && editingCell?.field === 'date' ? (
                                  <input
                                    type="date"
                                    value={editValue}
                                    onChange={handleEditChange}
                                    className="edit-input"
                                  />
                                ) : (
                                  <span className={isPending ? 'pending-text' : ''}>
                                    {formatDate(payout.date)}
                                    {isPending && <span className="pending-indicator"> ⏳</span>}
                                  </span>
                                )}
                              </td>
                              <td 
                                className="funds-released editable-cell"
                                onDoubleClick={() => !isPending && handleCellDoubleClick(payout.id, 'funds_released', payout.funds_released)}
                              >
                                {isEditing && editingCell?.field === 'funds_released' ? (
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={handleEditChange}
                                    className="edit-input"
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter amount"
                                  />
                                ) : (
                                  <span className={isPending ? 'pending-text' : ''}>
                                    {formatAmount(payout.funds_released)}
                                    {isPending && <span className="pending-indicator"> ⏳</span>}
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isEditing && (
                              <tr className="edit-actions-row">
                                <td colSpan="4">
                                  <div className="edit-actions">
                                    <button onClick={handleSaveEdit} className="save-btn">Save</button>
                                    <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                                  </div>
                                </td>
              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
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
                <div className="payouts-summary">
                  <p>Total Payouts: {filteredAndSortedPayouts.length}</p>
                  <p>Total Amount Released: {formatAmount(filteredAndSortedPayouts.reduce((sum, payout) => sum + Number(payout.funds_released), 0))}</p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="payouts-graph-side">
          <div className="payouts-graphs-stack">
            <Bar data={barData} options={barOptions} />
            <div style={{ height: 32 }} />
            <Bar data={barDataDay} options={barOptionsDay} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payouts;