import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Transactions.css';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';

const CsvIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
    <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#0EA5E9"/>
    <path d="M13 2v5h5" fill="#0EA5E9"/>
    <rect x="7" y="11" width="10" height="1.5" fill="#E0F2FE"/>
    <rect x="7" y="14" width="10" height="1.5" fill="#E0F2FE"/>
    <rect x="7" y="17" width="6" height="1.5" fill="#E0F2FE"/>
  </svg>
);

const TxtIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
    <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#6B7280"/>
    <path d="M13 2v5h5" fill="#6B7280"/>
    <rect x="7" y="11" width="10" height="1.5" fill="#F3F4F6"/>
    <rect x="7" y="14" width="10" height="1.5" fill="#F3F4F6"/>
    <rect x="7" y="17" width="6" height="1.5" fill="#F3F4F6"/>
  </svg>
);

const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
    <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#EF4444"/>
    <path d="M13 2v5h5" fill="#EF4444"/>
    <text x="8" y="16" fontSize="7" fill="#FFF" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold">PDF</text>
  </svg>
);

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); 
  const [showFilter, setShowFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    date: '',
    amount: '',
    description: '',
    type: 'credit',
    notes: ''
  });
  const [modalError, setModalError] = useState('');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  
  const [editingCell, setEditingCell] = useState(null); 
  const [editValue, setEditValue] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPerPage] = useState(20);
  const [showExportDropdown, setShowExportDropdown] = useState(false);


  const filterRef = useRef(null);
  const [descPopup, setDescPopup] = useState({ open: false, text: '', title: '' });
  const longPressTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetchTransactions();
  }, []);



  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, startDate, endDate, typeFilter]);

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

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;

  const openDescriptionPopup = (text, title = 'Description') => {
    setDescPopup({ open: true, text: text || 'N/A', title });
  };

  const closeDescriptionPopup = () => {
    setDescPopup({ open: false, text: '' });
  };

  const handleDescriptionTouchStart = (text, e, title = 'Description') => {
    if (!isMobileViewport()) return;
    if (e.touches && e.touches.length > 0) {
      const t = e.touches[0];
      touchStartPosRef.current = { x: t.clientX, y: t.clientY };
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    openDescriptionPopup(text, title);
  };

  const handleDescriptionTouchMove = (e) => {
    if (!isMobileViewport()) return;
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(t.clientY - touchStartPosRef.current.y);
    const MOVE_THRESHOLD_PX = 10;
    if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      closeDescriptionPopup();
    }
  };

  const handleDescriptionTouchEnd = () => {
    if (!isMobileViewport()) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    closeDescriptionPopup();
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API_ENDPOINTS.TRANSACTIONS);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError('Failed to load transactions. Please try again later.');
      console.error('Error fetching transactions:', err);
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

  const getTransactionType = (credit, debit) => {
    if (credit > 0) return 'credit';
    if (debit > 0) return 'debit';
    return 'neutral';
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
    
    const originalTransaction = transactions.find(tx => tx.id === editingCell.rowId);
    const originalTransactions = [...transactions];
    
    try {
      const token = localStorage.getItem('token');
      let updateData = { [editingCell.field]: editValue };
      
      if (editingCell.field === 'credit') {
        updateData = { 
          credit: Number(editValue) || 0, 
          debit: 0 
        };
      } else if (editingCell.field === 'debit') {
        updateData = { 
          debit: Number(editValue) || 0, 
          credit: 0 
        };
      }
      
      setTransactions(prev => prev.map(tx => 
        tx.id === editingCell.rowId 
          ? { ...tx, ...updateData }
          : tx
      ));
      
      setEditingCell(null);
      setEditValue('');
      
      const response = await fetch(`${API_ENDPOINTS.TRANSACTIONS}/${editingCell.rowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update transaction');
      }
      
      setTimeout(() => {
        fetchTransactions();
      }, 100);
      
    } catch (err) {
      console.error('Error updating transaction:', err);
      
      setTransactions(originalTransactions);
      
      alert(`Failed to update transaction: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    
    const originalTransactions = [...transactions];
    
    try {
      // Optimistic update - remove from UI immediately
      setTransactions(prev => prev.filter(tx => tx.id !== transactionToDelete.id));
      setShowDeleteModal(false);
      setTransactionToDelete(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.TRANSACTIONS}/${transactionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }
      
      // Refresh data to ensure balances are recalculated
      setTimeout(() => {
        fetchTransactions();
      }, 100);
      
    } catch (err) {
      console.error('Error deleting transaction:', err);
      
      // Revert optimistic update on error
      setTransactions(originalTransactions);
      alert(`Failed to delete transaction: ${err.message}`);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTransactions(filteredTransactions.map(tx => tx.id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleSelectTransaction = (transactionId) => {
    setSelectedTransactions(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else {
        return [...prev, transactionId];
      }
    });
  };

  const handleBulkDeleteClick = () => {
    if (selectedTransactions.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    
    const originalTransactions = [...transactions];
    const transactionsToDelete = transactions.filter(tx => selectedTransactions.includes(tx.id));
    
    try {
      // Optimistic update - remove from UI immediately
      setTransactions(prev => prev.filter(tx => !selectedTransactions.includes(tx.id)));
      setShowBulkDeleteModal(false);
      setSelectedTransactions([]);
      
      const token = localStorage.getItem('token');
      
      // Delete transactions one by one (could be optimized with a bulk endpoint)
      for (const transactionId of selectedTransactions) {
        const response = await fetch(`${API_ENDPOINTS.TRANSACTIONS}/${transactionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to delete transaction ${transactionId}: ${errorData.error || 'Unknown error'}`);
        }
      }
      
      // Refresh data to ensure balances are recalculated
      setTimeout(() => {
        fetchTransactions();
      }, 100);
      
    } catch (err) {
      console.error('Error bulk deleting transactions:', err);
      
      // Revert optimistic update on error
      setTransactions(originalTransactions);
      alert(`Failed to delete transactions: ${err.message}`);
    }
  };

  const handleCancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
  };

  // Pagination handlers
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedTransactions([]); // Clear selections when changing pages
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

  const filteredTransactions = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      const afterStart = !startDate || txDate >= new Date(startDate);
      const beforeEnd = !endDate || txDate <= new Date(endDate);
      let typeMatch = true;
      if (typeFilter === 'debits') typeMatch = tx.debit > 0;
      if (typeFilter === 'credits') typeMatch = tx.credit > 0;
      return afterStart && beforeEnd && typeMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  // Pagination logic
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      'S.No.',
      'Date',
      'Description',
      'Credit',
      'Debit',
      'Previous Balance',
      'Remaining Balance',
      'Notes'
    ];
    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      formatDate(tx.date),
      tx.description || 'N/A',
      tx.credit > 0 ? tx.credit : '',
      tx.debit > 0 ? tx.debit : '',
      tx.previous_balance,
      tx.remaining_balance,
      tx.notes || ''
    ]);
    const csvContent =
      [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const exportToTXT = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      'S.No.',
      'Date',
      'Description',
      'Credit',
      'Debit',
      'Previous Balance',
      'Remaining Balance',
      'Notes'
    ];
    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      formatDate(tx.date),
      tx.description || 'N/A',
      tx.credit > 0 ? tx.credit : '',
      tx.debit > 0 ? tx.debit : '',
      tx.previous_balance,
      tx.remaining_balance,
      tx.notes || ''
    ]);
    
    let txtContent = 'TRANSACTIONS REPORT\n';
    txtContent += '='.repeat(50) + '\n\n';
    txtContent += headers.join('\t') + '\n';
    txtContent += '-'.repeat(100) + '\n';
    
    rows.forEach(row => {
      txtContent += row.join('\t') + '\n';
    });
    
    txtContent += '\n' + '='.repeat(50) + '\n';
    txtContent += `Total Transactions: ${filteredTransactions.length}\n`;
    txtContent += `Generated on: ${new Date().toLocaleString()}\n`;
    
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const exportToPDF = () => {
    if (filteredTransactions.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
    const title = 'Transactions Report';
    const generatedOn = `Generated on: ${new Date().toLocaleString()}`;
    doc.setFontSize(16);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.text(generatedOn, 40, 58);

    const headers = [[
      'S.No.',
      'Date',
      'Description',
      'Credit (₹)',
      'Debit (₹)',
      'Previous Balance (₹)',
      'Remaining Balance (₹)',
      'Notes'
    ]];
    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      formatDate(tx.date),
      tx.description || 'N/A',
      tx.credit > 0 ? Number(tx.credit).toLocaleString('en-IN') : '',
      tx.debit > 0 ? Number(tx.debit).toLocaleString('en-IN') : '',
      Number(tx.previous_balance || 0).toLocaleString('en-IN'),
      Number(tx.remaining_balance || 0).toLocaleString('en-IN'),
      tx.notes || ''
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
        1: { cellWidth: 80 },
        2: { cellWidth: 200 },
        3: { cellWidth: 90, halign: 'right' },
        4: { cellWidth: 90, halign: 'right' },
        5: { cellWidth: 140, halign: 'right' },
        6: { cellWidth: 160, halign: 'right' },
        7: { cellWidth: 160 },
      },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const footerY = pageSize.height - 20;
        doc.setFontSize(9);
        doc.text(`Total Transactions: ${filteredTransactions.length}`, 40, footerY);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageSize.width - 120, footerY);
      },
      margin: { left: 40, right: 40 },
    });

    doc.save('transactions.pdf');
    setShowExportDropdown(false);
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!modalData.date || !modalData.amount || !modalData.type) {
      setModalError('Date, amount, and type are required.');
      return;
    }
    
    const originalTransactions = [...transactions];
    
    try {
      setIsAddingTransaction(true);
      const token = localStorage.getItem('token');
      const newTransactionData = {
        date: modalData.date,
        amount: Number(modalData.amount),
        description: modalData.description,
        type: modalData.type,
        notes: modalData.notes
      };
      
      const tempTransaction = {
        id: `temp-${Date.now()}`,
        ...newTransactionData,
        credit: newTransactionData.type === 'credit' ? newTransactionData.amount : 0,
        debit: newTransactionData.type === 'debit' ? newTransactionData.amount : 0,
        previous_balance: 0, 
        remaining_balance: 0, 
        isPending: true 
      };
      
      setTransactions(prev => [...prev, tempTransaction]);
      
      setShowModal(false);
      setModalData({ date: '', amount: '', description: '', type: 'credit', notes: '' });
      
      const res = await fetch(API_ENDPOINTS.TRANSACTIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTransactionData)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add transaction');
      }
      
      setTransactions(prev => prev.filter(tx => tx.id !== tempTransaction.id));
      
      setTimeout(() => {
        fetchTransactions();
      }, 100);
      
    } catch (err) {
      console.error('Error adding transaction:', err);
      
      setTransactions(originalTransactions);
      
      setShowModal(true);
      setModalError(err.message);
    } finally {
      setIsAddingTransaction(false);
    }
  };

  if (loading) {
    return (
      <div className="transactions-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transactions-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchTransactions} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions-container">
      <div className="transactions-header">
        <h2>All Transactions</h2>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {selectedTransactions.length > 0 && (
            <button
              className="bulk-delete-btn"
              onClick={handleBulkDeleteClick}
              style={{ marginRight: '1rem' }}
            >
              Delete Selected ({selectedTransactions.length})
            </button>
          )}
          <button
            className="transactions-new-btn"
            onClick={() => setShowModal(true)}
          >
            New
          </button>
          <div className="transactions-filter-dropdown-wrapper" ref={filterRef}>
            <button
              className="transactions-filter-btn"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              Filter &#x25BC;
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
                <div className="filter-section transactions-type-filter">
                  <label>
                    <input
                      type="radio"
                      name="typeFilter"
                      value="all"
                      checked={typeFilter === 'all'}
                      onChange={() => setTypeFilter('all')}
                    />
                    All
                  </label>
                  <label style={{ marginLeft: '1rem' }}>
                    <input
                      type="radio"
                      name="typeFilter"
                      value="debits"
                      checked={typeFilter === 'debits'}
                      onChange={() => setTypeFilter('debits')}
                    />
                    Debits only
                  </label>
                  <label style={{ marginLeft: '1rem' }}>
                    <input
                      type="radio"
                      name="typeFilter"
                      value="credits"
                      checked={typeFilter === 'credits'}
                      onChange={() => setTypeFilter('credits')}
                    />
                    Credits only
                  </label>
                </div>
                <div className="filter-section">
                  <button
                    className="clear-filters-btn"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSortOrder('desc');
                      setTypeFilter('all');
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="transactions-export-dropdown-wrapper">
            <button
              className="transactions-export-btn"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              style={{ marginLeft: '1rem' }}
            >
              Export ▼
            </button>
              {showExportDropdown && (
               <div className="transactions-export-dropdown">
                 <button onClick={exportToCSV} className="export-option">
                   <CsvIcon /> Export as CSV
                 </button>
                 <button onClick={exportToTXT} className="export-option">
                   <TxtIcon /> Export as TXT
                 </button>
                 <button onClick={exportToPDF} className="export-option">
                   <PdfIcon /> Export as PDF
                 </button>
               </div>
             )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="transactions-modal-backdrop">
          <div className="transactions-modal">
            <h3>Add New Transaction</h3>
            <form onSubmit={handleAddTransaction} className="transactions-modal-form">
              <label>
                Date:
                <input type="date" name="date" value={modalData.date} onChange={handleModalChange} required />
              </label>
              <label>
                Amount:
                <input type="number" name="amount" value={modalData.amount} onChange={handleModalChange} min="0.01" step="0.01" required />
              </label>
              <label>
                Description:
                <input type="text" name="description" value={modalData.description} onChange={handleModalChange} />
              </label>
              <label>
                Transaction Type:
                <select name="type" value={modalData.type} onChange={handleModalChange} required>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </label>
              <label>
                Notes:
                <textarea name="notes" value={modalData.notes} onChange={handleModalChange} />
              </label>
              {modalError && <div className="transactions-modal-error">{modalError}</div>}
              <div className="transactions-modal-actions">
                <button 
                  type="submit" 
                  className="transactions-modal-submit"
                  disabled={isAddingTransaction}
                >
                  {isAddingTransaction ? 'Adding...' : 'Add'}
                </button>
                <button 
                  type="button" 
                  className="transactions-modal-cancel" 
                  onClick={() => setShowModal(false)}
                  disabled={isAddingTransaction}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="transactions-modal-backdrop">
          <div className="transactions-modal delete-modal">
            <h3>Delete Transaction</h3>
            <div className="delete-confirmation">
              <p>Are you sure you want to delete this transaction?</p>
              <div className="transaction-preview">
                <p><strong>Date:</strong> {transactionToDelete && formatDate(transactionToDelete.date)}</p>
                <p><strong>Description:</strong> {transactionToDelete?.description || 'N/A'}</p>
                <p><strong>Amount:</strong> {transactionToDelete && formatAmount(transactionToDelete.credit > 0 ? transactionToDelete.credit : transactionToDelete.debit)}</p>
                <p><strong>Type:</strong> {transactionToDelete && (transactionToDelete.credit > 0 ? 'Credit' : 'Debit')}</p>
              </div>
              <p className="warning-text">⚠️ This action cannot be undone and will recalculate all subsequent balances.</p>
            </div>
            <div className="transactions-modal-actions">
              <button 
                onClick={handleConfirmDelete} 
                className="delete-btn"
              >
                Delete
              </button>
              <button 
                onClick={handleCancelDelete} 
                className="transactions-modal-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="transactions-modal-backdrop">
          <div className="transactions-modal delete-modal">
            <h3>Delete Multiple Transactions</h3>
            <div className="delete-confirmation">
              <p>Are you sure you want to delete {selectedTransactions.length} selected transaction(s)?</p>
              <div className="transaction-preview">
                <p><strong>Selected Transactions:</strong></p>
                <div className="selected-transactions-list">
                  {transactions
                    .filter(tx => selectedTransactions.includes(tx.id))
                    .slice(0, 5) // Show first 5 for preview
                    .map(tx => (
                      <div key={tx.id} className="selected-transaction-item">
                        <span>{formatDate(tx.date)}</span>
                        <span>{tx.description || 'N/A'}</span>
                        <span>{formatAmount(tx.credit > 0 ? tx.credit : tx.debit)}</span>
                      </div>
                    ))}
                  {selectedTransactions.length > 5 && (
                    <div className="more-transactions">
                      ... and {selectedTransactions.length - 5} more
                    </div>
                  )}
                </div>
              </div>
              <p className="warning-text">⚠️ This action cannot be undone and will recalculate all subsequent balances.</p>
            </div>
            <div className="transactions-modal-actions">
              <button 
                onClick={handleConfirmBulkDelete} 
                className="delete-btn"
              >
                Delete All
              </button>
              <button 
                onClick={handleCancelBulkDelete} 
                className="transactions-modal-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredTransactions.length === 0 ? (
        <div className="no-transactions">
          <p>No transactions found.</p>
        </div>
      ) : (
        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedTransactions.length === currentTransactions.length && currentTransactions.length > 0}
                    ref={input => {
                      if (input) {
                        input.indeterminate = selectedTransactions.length > 0 && selectedTransactions.length < currentTransactions.length;
                      }
                    }}
                  />
                </th>
                <th>S.No.</th>
                <th>Date</th>
                <th>Description</th>
                <th>Credit</th>
                <th>Debit</th>
                <th>Previous Balance</th>
                <th>Remaining Balance</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {currentTransactions.map((transaction, index) => {
                const transactionType = getTransactionType(transaction.credit, transaction.debit);
                const isEditing = editingCell?.rowId === transaction.id;
                const isPending = transaction.isPending;
                
                return (
                  <React.Fragment key={transaction.id}>
                    <tr className={`transaction-row ${transactionType} ${isPending ? 'pending-transaction' : ''}`}>
                      <td className="checkbox-cell">
                        <input 
                          type="checkbox" 
                          checked={selectedTransactions.includes(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          disabled={isPending}
                        />
                      </td>
                      <td className="serial-number">{indexOfFirstTransaction + index + 1}</td>
                      <td 
                        className="editable-cell"
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'date', transaction.date)}
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
                            {formatDate(transaction.date)}
                            {isPending && <span className="pending-indicator"> ⏳</span>}
                          </span>
                        )}
                      </td>
                      <td 
                        className="editable-cell description"
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'description', transaction.description || '')}
                        onTouchStart={(e) => handleDescriptionTouchStart(transaction.description || 'N/A', e, 'Description')}
                        onTouchMove={handleDescriptionTouchMove}
                        onTouchEnd={handleDescriptionTouchEnd}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {isEditing && editingCell?.field === 'description' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleEditChange}
                            className="edit-input"
                          />
                        ) : (
                          <span className={isPending ? 'pending-text' : ''}>
                            {transaction.description || 'N/A'}
                          </span>
                        )}
                      </td>
                      <td 
                        className={`amount credit ${transaction.credit > 0 ? 'positive' : ''} editable-cell`}
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'credit', transaction.credit || 0)}
                      >
                        {isEditing && editingCell?.field === 'credit' ? (
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
                            {transaction.credit > 0 ? formatAmount(transaction.credit) : '-'}
                          </span>
                        )}
                      </td>
                      <td 
                        className={`amount debit ${transaction.debit > 0 ? 'negative' : ''} editable-cell`}
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'debit', transaction.debit || 0)}
                      >
                        {isEditing && editingCell?.field === 'debit' ? (
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
                            {transaction.debit > 0 ? formatAmount(transaction.debit) : '-'}
                          </span>
                        )}
                      </td>
                      <td className="balance">
                        <span className={isPending ? 'pending-text' : ''}>
                          {formatAmount(transaction.previous_balance)}
                        </span>
                      </td>
                      <td className="balance">
                        <span className={isPending ? 'pending-text' : ''}>
                          {formatAmount(transaction.remaining_balance)}
                        </span>
                      </td>
                      <td 
                        className="editable-cell notes"
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'notes', transaction.notes || '')}
                        onTouchStart={(e) => handleDescriptionTouchStart(transaction.notes || 'N/A', e, 'Notes')}
                        onTouchMove={handleDescriptionTouchMove}
                        onTouchEnd={handleDescriptionTouchEnd}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {isEditing && editingCell?.field === 'notes' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleEditChange}
                            className="edit-input"
                          />
                        ) : (
                          <span className={isPending ? 'pending-text' : ''}>
                            {transaction.notes || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="edit-actions-row">
                        <td colSpan="9">
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
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            <span>
              Showing {indexOfFirstTransaction + 1} to {Math.min(indexOfLastTransaction, filteredTransactions.length)} of {filteredTransactions.length} transactions
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

      <div className="transactions-summary">
        <p>Total Transactions: {filteredTransactions.length}</p>
      </div>

      {descPopup.open && (
        <div className="desc-popup-backdrop" onClick={closeDescriptionPopup}>
          <div className="desc-popup" onClick={(e) => e.stopPropagation()}>
            <div className="desc-popup-header">
              <h4>{descPopup.title || 'Description'}</h4>
            </div>
            <div className="desc-popup-content">{descPopup.text}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions; 