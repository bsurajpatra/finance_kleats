import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './CashfreeSettlements.css';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';

const CashfreeSettlements = () => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    sortOrder: 'desc'
  });
  const [showFilter, setShowFilter] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const filterRef = React.useRef(null);
  const exportRef = React.useRef(null);
  const [pagination, setPagination] = useState({
    limit: 50,
    cursor: null
  });
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    itemsPerPage: 20
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
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    }
    if (showFilter || showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilter, showExportDropdown]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = () => {
    resetPagination();
    fetchSettlements(true);
  };

  const handleClearFilters = () => {
    setFilters({ start_date: '', end_date: '', sortOrder: 'desc' });
    setPagination({ limit: 50, cursor: null });
    resetPagination();
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

  // Sort settlements based on current sort order
  const getSortedSettlements = () => {
    const sorted = [...settlements].sort((a, b) => {
      const dateA = new Date(a.transfer_time || a.settled_at || 0);
      const dateB = new Date(b.transfer_time || b.settled_at || 0);
      return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return sorted;
  };

  // Get paginated settlements
  const getPaginatedSettlements = () => {
    const sortedSettlements = getSortedSettlements();
    const startIndex = (clientPagination.currentPage - 1) * clientPagination.itemsPerPage;
    const endIndex = startIndex + clientPagination.itemsPerPage;
    return sortedSettlements.slice(startIndex, endIndex);
  };

  // Get pagination info
  const getPaginationInfo = () => {
    const sortedSettlements = getSortedSettlements();
    const totalItems = sortedSettlements.length;
    const totalPages = Math.ceil(totalItems / clientPagination.itemsPerPage);
    const startIndex = (clientPagination.currentPage - 1) * clientPagination.itemsPerPage;
    const endIndex = Math.min(startIndex + clientPagination.itemsPerPage, totalItems);
    
    return {
      totalItems,
      totalPages,
      startIndex: startIndex + 1,
      endIndex,
      hasNextPage: clientPagination.currentPage < totalPages,
      hasPrevPage: clientPagination.currentPage > 1
    };
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setClientPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  // Reset pagination when filters change
  const resetPagination = () => {
    setClientPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  // Export functions
  const exportToCSV = () => {
    const sortedSettlements = getSortedSettlements();
    if (sortedSettlements.length === 0) return;
    
    const headers = [
      'S.No.',
      'Amount Settled',
      'Payment From',
      'Payment Till',
      'Settled At'
    ];
    
    const rows = sortedSettlements.map((settlement, index) => [
      index + 1,
      formatCurrency(Number(settlement.amount_settled || 0)),
      settlement.payment_from ? formatDate(settlement.payment_from) : '—',
      settlement.payment_till ? formatDate(settlement.payment_till) : '—',
      settlement.transfer_time ? formatDate(settlement.transfer_time) : (settlement.settled_at ? formatDate(settlement.settled_at) : '—')
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cashfree-settlements.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const exportToTXT = () => {
    const sortedSettlements = getSortedSettlements();
    if (sortedSettlements.length === 0) return;
    
    const headers = [
      'S.No.',
      'Amount Settled',
      'Payment From',
      'Payment Till',
      'Settled At'
    ];
    
    const rows = sortedSettlements.map((settlement, index) => [
      index + 1,
      formatCurrency(Number(settlement.amount_settled || 0)),
      settlement.payment_from ? formatDate(settlement.payment_from) : '—',
      settlement.payment_till ? formatDate(settlement.payment_till) : '—',
      settlement.transfer_time ? formatDate(settlement.transfer_time) : (settlement.settled_at ? formatDate(settlement.settled_at) : '—')
    ]);
    
    let txtContent = 'CASHFREE SETTLEMENTS REPORT\n';
    txtContent += '='.repeat(50) + '\n\n';
    txtContent += headers.join('\t') + '\n';
    txtContent += '-'.repeat(100) + '\n';
    
    rows.forEach(row => {
      txtContent += row.join('\t') + '\n';
    });
    
    txtContent += '\n' + '='.repeat(50) + '\n';
    txtContent += `Total Settlements: ${sortedSettlements.length}\n`;
    txtContent += `Generated on: ${new Date().toLocaleString()}\n`;
    
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cashfree-settlements.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const exportToPDF = () => {
    const sortedSettlements = getSortedSettlements();
    if (sortedSettlements.length === 0) return;
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
    const title = 'Cashfree Settlements Report';
    const generatedOn = `Generated on: ${new Date().toLocaleString()}`;
    
    doc.setFontSize(16);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.text(generatedOn, 40, 58);

    const headers = [[
      'S.No.',
      'Amount Settled',
      'Payment From',
      'Payment Till',
      'Settled At'
    ]];
    
    const rows = sortedSettlements.map((settlement, index) => [
      index + 1,
      formatCurrency(Number(settlement.amount_settled || 0)),
      settlement.payment_from ? formatDate(settlement.payment_from) : '—',
      settlement.payment_till ? formatDate(settlement.payment_till) : '—',
      settlement.transfer_time ? formatDate(settlement.transfer_time) : (settlement.settled_at ? formatDate(settlement.settled_at) : '—')
    ]);

    doc.autoTable({
      head: headers,
      body: rows,
      startY: 80,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [242, 242, 242], textColor: 20 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 120 },
        2: { cellWidth: 150 },
        3: { cellWidth: 150 },
        4: { cellWidth: 150 }
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const footerY = pageSize.height - 20;
        doc.setFontSize(9);
        doc.text(`Total Settlements: ${sortedSettlements.length}`, 40, footerY);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageSize.width - 120, footerY);
      },
      margin: { left: 40, right: 40 },
    });

    doc.save('cashfree-settlements.pdf');
    setShowExportDropdown(false);
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
                  <label htmlFor="cf-sort">Sort by date:</label>
                  <select
                    id="cf-sort"
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    style={{ marginLeft: '0.5rem', padding: '0.3rem 0.7rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
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
          <div className="export-dropdown-wrapper" ref={exportRef}>
            <button
              className="export-btn"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
            >
              Export ▼
            </button>
            {showExportDropdown && (
              <div className="export-dropdown">
                <button onClick={exportToCSV} className="export-option">
                  📊 Export as CSV
                </button>
                <button onClick={exportToTXT} className="export-option">
                  📄 Export as TXT
                </button>
                <button onClick={exportToPDF} className="export-option">
                  📋 Export as PDF
                </button>
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
            <p>Total Settlements: {getSortedSettlements().length}</p>
            <p>Total Amount Settled: {formatCurrency(
              getSortedSettlements().reduce((sum, s) => sum + (Number(s.amount_settled || 0)), 0)
            )}</p>
          </div>
          
          <div className="settlements-table">
            <div className="table-header">
              <div className="col-sno">S.No.</div>
              <div className="col-amount">Amount Settled</div>
              <div className="col-from">Payment From</div>
              <div className="col-till">Payment Till</div>
              <div className="col-settled">Settled At</div>
            </div>
            
            {getPaginatedSettlements().map((settlement, index) => {
              const paginationInfo = getPaginationInfo();
              const globalIndex = paginationInfo.startIndex + index - 1;
              return (
                <div key={globalIndex} className="table-row">
                  <div className="serial-number col-sno">{globalIndex + 1}</div>
                  <div className="settlement-amount col-amount">{formatCurrency(Number(settlement.amount_settled || 0))}</div>
                  <div className="payment-time col-from">{settlement.payment_from ? formatDate(settlement.payment_from) : '—'}</div>
                  <div className="payment-time col-till">{settlement.payment_till ? formatDate(settlement.payment_till) : '—'}</div>
                  <div className="transfer-time col-settled">{settlement.transfer_time ? formatDate(settlement.transfer_time) : (settlement.settled_at ? formatDate(settlement.settled_at) : '—')}</div>
                </div>
              );
            })}
          </div>
          
          {/* Pagination Controls */}
          {(() => {
            const paginationInfo = getPaginationInfo();
            if (paginationInfo.totalPages <= 1) return null;
            
            return (
              <div className="pagination-controls">
                <div className="pagination-info">
                  Showing {paginationInfo.startIndex} to {paginationInfo.endIndex} of {paginationInfo.totalItems} settlements
                </div>
                <div className="pagination-buttons">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(clientPagination.currentPage - 1)}
                    disabled={!paginationInfo.hasPrevPage}
                  >
                    Previous
                  </button>
                  
                  <div className="page-numbers">
                    {(() => {
                      const pages = [];
                      const totalPages = paginationInfo.totalPages;
                      const currentPage = clientPagination.currentPage;
                      
                      // Show page numbers with ellipsis for large page counts
                      if (totalPages <= 7) {
                        // Show all pages if 7 or fewer
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(
                            <button
                              key={i}
                              className={`page-number ${i === currentPage ? 'active' : ''}`}
                              onClick={() => handlePageChange(i)}
                            >
                              {i}
                            </button>
                          );
                        }
                      } else {
                        // Show first page
                        pages.push(
                          <button
                            key={1}
                            className={`page-number ${1 === currentPage ? 'active' : ''}`}
                            onClick={() => handlePageChange(1)}
                          >
                            1
                          </button>
                        );
                        
                        // Show ellipsis if current page is far from start
                        if (currentPage > 4) {
                          pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
                        }
                        
                        // Show pages around current page
                        const start = Math.max(2, currentPage - 1);
                        const end = Math.min(totalPages - 1, currentPage + 1);
                        
                        for (let i = start; i <= end; i++) {
                          if (i !== 1 && i !== totalPages) {
                            pages.push(
                              <button
                                key={i}
                                className={`page-number ${i === currentPage ? 'active' : ''}`}
                                onClick={() => handlePageChange(i)}
                              >
                                {i}
                              </button>
                            );
                          }
                        }
                        
                        // Show ellipsis if current page is far from end
                        if (currentPage < totalPages - 3) {
                          pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
                        }
                        
                        // Show last page
                        if (totalPages > 1) {
                          pages.push(
                            <button
                              key={totalPages}
                              className={`page-number ${totalPages === currentPage ? 'active' : ''}`}
                              onClick={() => handlePageChange(totalPages)}
                            >
                              {totalPages}
                            </button>
                          );
                        }
                      }
                      
                      return pages;
                    })()}
                  </div>
                  
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(clientPagination.currentPage + 1)}
                    disabled={!paginationInfo.hasNextPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default CashfreeSettlements;
