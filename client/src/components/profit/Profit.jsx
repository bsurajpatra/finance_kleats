import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './Profit.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Profit = ({ canteenId = null }) => {
  const [grossProfitData, setGrossProfitData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first
  const [showGrossFilter, setShowGrossFilter] = useState(false);
  const [showNetFilter, setShowNetFilter] = useState(false);
  const [showGrossExport, setShowGrossExport] = useState(false);
  const [showNetExport, setShowNetExport] = useState(false);
  const grossFilterRef = React.useRef(null);
  const netFilterRef = React.useRef(null);
  const grossExportRef = React.useRef(null);
  const netExportRef = React.useRef(null);

  // Net profits by Cashfree settlement periods
  const [netProfits, setNetProfits] = useState(null);
  const [netLoading, setNetLoading] = useState(true);
  const [netError, setNetError] = useState(null);

  useEffect(() => {
    fetchGrossProfitData();
    fetchNetProfitsData();
  }, [canteenId, startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (grossFilterRef.current && !grossFilterRef.current.contains(event.target)) {
        setShowGrossFilter(false);
      }
      if (netFilterRef.current && !netFilterRef.current.contains(event.target)) {
        setShowNetFilter(false);
      }
      if (grossExportRef.current && !grossExportRef.current.contains(event.target)) {
        setShowGrossExport(false);
      }
      if (netExportRef.current && !netExportRef.current.contains(event.target)) {
        setShowNetExport(false);
      }
    }
    const shouldListen = showGrossFilter || showNetFilter || showGrossExport || showNetExport;
    if (shouldListen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGrossFilter, showNetFilter, showGrossExport, showNetExport]);

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

  const fetchNetProfitsData = async () => {
    try {
      setNetLoading(true);
      setNetError(null);
      const url = API_ENDPOINTS.NET_PROFITS_BY_SETTLEMENTS(canteenId || 'all', startDate || '', endDate || '');
      const response = await authFetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch net profits');
      }
      const data = await response.json();
      setNetProfits(data);
    } catch (err) {
      setNetError('Failed to load net profits. Please try again later.');
      console.error('Error fetching net profits:', err);
    } finally {
      setNetLoading(false);
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
  const totalNetProfit = netProfits?.totals?.net_profit || 0;

  // Export helpers - Gross
  const exportGrossToCSV = () => {
    const headers = ['S.No.', 'Date', 'Gross Profit (₹)'];
    const rows = sortedData.map((item, index) => [
      index + 1,
      new Date(item.order_date).toLocaleDateString('en-IN'),
      Number(item.gross_profit || 0).toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gross-profit.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const exportGrossToTXT = () => {
    let txt = 'GROSS PROFIT REPORT\n' + '='.repeat(60) + '\n\n';
    txt += `Generated on: ${new Date().toLocaleString('en-IN')}\n`;
    txt += `Total Records: ${sortedData.length}\n\n`;
    txt += ['S.No.', 'Date', 'Gross Profit (₹)'].join('\t') + '\n';
    txt += '-'.repeat(80) + '\n';
    sortedData.forEach((item, index) => {
      txt += [
        index + 1,
        new Date(item.order_date).toLocaleDateString('en-IN'),
        Number(item.gross_profit || 0).toFixed(2)
      ].join('\t') + '\n';
    });
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gross-profit.txt'; a.click(); URL.revokeObjectURL(url);
  };

  const exportGrossToPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'A4' });
    doc.setFontSize(14);
    doc.text('Gross Profit Report', 40, 40);
    const headers = [['S.No.', 'Date', 'Gross Profit (₹)']];
    const body = sortedData.map((item, index) => [
      index + 1,
      new Date(item.order_date).toLocaleDateString('en-IN'),
      Number(item.gross_profit || 0).toFixed(2)
    ]);
    doc.autoTable({ head: headers, body, startY: 60, styles: { fontSize: 9, cellPadding: 4 } });
    doc.save('gross-profit.pdf');
  };

  // Export helpers - Net
  const exportNetToCSV = () => {
    const periods = netProfits?.periods || [];
    const headers = ['S.No.', 'From', 'Till', 'Revenue (₹)', 'Settlement (₹)', 'Net Profit (₹)'];
    const rows = periods.map((p, idx) => [
      idx + 1,
      new Date(p.start).toLocaleString('en-IN'),
      new Date(p.end).toLocaleString('en-IN'),
      Number(p.revenue || 0).toFixed(2),
      Number(p.settlement || 0).toFixed(2),
      Number(p.net_profit || 0).toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'net-profit-by-settlement.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const exportNetToTXT = () => {
    const periods = netProfits?.periods || [];
    let txt = 'NET PROFIT BY SETTLEMENT REPORT\n' + '='.repeat(60) + '\n\n';
    txt += `Generated on: ${new Date().toLocaleString('en-IN')}\n`;
    txt += `Total Records: ${periods.length}\n\n`;
    txt += ['S.No.', 'From', 'Till', 'Revenue (₹)', 'Settlement (₹)', 'Net Profit (₹)'].join('\t') + '\n';
    txt += '-'.repeat(120) + '\n';
    periods.forEach((p, idx) => {
      txt += [
        idx + 1,
        new Date(p.start).toLocaleString('en-IN'),
        new Date(p.end).toLocaleString('en-IN'),
        Number(p.revenue || 0).toFixed(2),
        Number(p.settlement || 0).toFixed(2),
        Number(p.net_profit || 0).toFixed(2)
      ].join('\t') + '\n';
    });
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'net-profit-by-settlement.txt'; a.click(); URL.revokeObjectURL(url);
  };

  const exportNetToPDF = () => {
    const periods = netProfits?.periods || [];
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
    doc.setFontSize(14);
    doc.text('Net Profit by Settlement Report', 40, 40);
    const headers = [['S.No.', 'From', 'Till', 'Revenue (₹)', 'Settlement (₹)', 'Net Profit (₹)']];
    const body = periods.map((p, idx) => [
      idx + 1,
      new Date(p.start).toLocaleString('en-IN'),
      new Date(p.end).toLocaleString('en-IN'),
      Number(p.revenue || 0).toFixed(2),
      Number(p.settlement || 0).toFixed(2),
      Number(p.net_profit || 0).toFixed(2)
    ]);
    doc.autoTable({ head: headers, body, startY: 60, styles: { fontSize: 9, cellPadding: 4 } });
    doc.save('net-profit-by-settlement.pdf');
  };

  // Chart data preparation
  const getDailyChartData = () => {
    const dailyData = sortedData
      .slice()
      .sort((a, b) => new Date(a.order_date) - new Date(b.order_date))
      .map(item => ({
        date: new Date(item.order_date).toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short' 
        }),
        profit: Number(item.gross_profit || 0)
      }));

    return {
      labels: dailyData.map(item => item.date),
      datasets: [
        {
          label: 'Daily Gross Profit',
          data: dailyData.map(item => item.profit),
          backgroundColor: dailyData.map(item => 
            item.profit >= 0 ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)'
          ),
          borderColor: dailyData.map(item => 
            item.profit >= 0 ? 'rgba(40, 167, 69, 1)' : 'rgba(220, 53, 69, 1)'
          ),
          borderWidth: 1,
        },
      ],
    };
  };

  const getMonthlyChartData = () => {
    const monthMap = new Map();
    for (const item of sortedData) {
      const dt = new Date(item.order_date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const prev = monthMap.get(key) || 0;
      monthMap.set(key, prev + Number(item.gross_profit || 0));
    }

    const monthlyData = Array.from(monthMap.entries())
      .sort((a, b) => new Date(a[0] + '-01') - new Date(b[0] + '-01'))
      .map(([key, sum]) => ({
        month: new Date(key + '-01').toLocaleDateString('en-IN', { 
          month: 'short', 
          year: 'numeric' 
        }),
        profit: Number(sum || 0)
      }));

    return {
      labels: monthlyData.map(item => item.month),
      datasets: [
        {
          label: 'Monthly Gross Profit',
          data: monthlyData.map(item => item.profit),
          backgroundColor: monthlyData.map(item => 
            item.profit >= 0 ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)'
          ),
          borderColor: monthlyData.map(item => 
            item.profit >= 0 ? 'rgba(40, 167, 69, 1)' : 'rgba(220, 53, 69, 1)'
          ),
          borderWidth: 1,
        },
      ],
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatAmount(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + value.toLocaleString('en-IN');
          }
        }
      }
    },
  };

  if (loading) {
    return (
      <div className="net-profit-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading profits data...</p>
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
    <div className="profit-two-col">
      <div className="net-profit-container">
        <div className="net-profit-header">
        <h2>Daily Gross Profit Report</h2>
        <div className="header-actions">
            <div className="settle-export" ref={grossExportRef}>
              <div className="export-header">
                <button
                  className="export-toggle-btn"
                  onClick={() => setShowGrossExport(prev => !prev)}
                >
                  <span>📊 Export</span>
                </button>
              </div>
              {showGrossExport && (
                <div className="export-dropdown">
                  <button onClick={exportGrossToPDF} className="export-option">📋 Export as PDF</button>
                  <button onClick={exportGrossToCSV} className="export-option">📊 Export as CSV</button>
                  <button onClick={exportGrossToTXT} className="export-option">📄 Export as TXT</button>
                </div>
              )}
            </div>
          <div className="transactions-filter-dropdown-wrapper" ref={grossFilterRef}>
            <button
              className="transactions-filter-btn"
              onClick={() => setShowGrossFilter(prev => !prev)}
            >
              Filter ▼
            </button>
            {showGrossFilter && (
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

      {/* Gross Profit Table */}
      <div>
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
                    <th>S.No.</th>
                    <th>Date</th>
                    <th>Gross Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((item, index) => (
                    <tr key={`${item.order_date}-${index}`} className="profit-row">
                      <td className="sno-cell">
                        {index + 1}
                      </td>
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

      {/* Charts Section */}
      {sortedData.length > 0 && (
        <div className="profit-charts">
          {/* Daily Chart */}
          <div className="chart-card">
            <div className="chart-title">Daily Gross Profit</div>
            <div className="chart-container">
              <Bar data={getDailyChartData()} options={chartOptions} />
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="chart-card">
            <div className="chart-title">Monthly Gross Profit</div>
            <div className="chart-container">
              <Bar data={getMonthlyChartData()} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Second main container: Net Profits */}
      <div className="net-profit-container">
        <div className="net-profit-header">
          <h2>Net Profits by Settlement Period</h2>
          <div className="header-actions">
            <div className="settle-export" ref={netExportRef}>
              <div className="export-header">
                <button
                  className="export-toggle-btn"
                  onClick={() => setShowNetExport(prev => !prev)}
                >
                  <span>📊 Export</span>
                </button>
              </div>
              {showNetExport && (
                <div className="export-dropdown">
                  <button onClick={exportNetToPDF} className="export-option">📋 Export as PDF</button>
                  <button onClick={exportNetToCSV} className="export-option">📊 Export as CSV</button>
                  <button onClick={exportNetToTXT} className="export-option">📄 Export as TXT</button>
                </div>
              )}
            </div>
            <div className="transactions-filter-dropdown-wrapper" ref={netFilterRef}>
              <button
                className="transactions-filter-btn"
                onClick={() => setShowNetFilter(prev => !prev)}
              >
                Filter ▼
              </button>
              {showNetFilter && (
                <div className="transactions-filter-dropdown">
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
              onClick={fetchNetProfitsData}
              title="Refresh net profits"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
            
          </div>
        </div>
        <div className="summary-stats">
          <div className="stat-card">
            <h3>Total Net Profit</h3>
            <div className="stat-value">{netLoading ? '—' : formatAmount(totalNetProfit)}</div>
          </div>
        </div>
        <div>
          {netError && (
            <div className="error-message" style={{ marginTop: '0.5rem' }}>{netError}</div>
          )}
          {netLoading ? (
            <div className="loading" style={{ padding: '0.5rem 0' }}>Loading net profits…</div>
          ) : !netProfits || (netProfits?.periods?.length || 0) === 0 ? (
            <div className="no-data">No settlement periods found for the selected range.</div>
          ) : (
            <div className="table-container">
              <table className="net-profit-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>From</th>
                    <th>Till</th>
                    <th>Revenue (₹)</th>
                    <th>Settlement (₹)</th>
                    <th>Net Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {netProfits.periods.map((p, idx) => (
                    <tr key={`${p.start}-${p.end}-${p.utr || idx}`} className="profit-row">
                      <td className="sno-cell">{idx + 1}</td>
                      <td className="date-cell">{new Date(p.start).toLocaleString('en-IN')}</td>
                      <td className="date-cell">{new Date(p.end).toLocaleString('en-IN')}</td>
                      <td>{formatAmount(p.revenue)}</td>
                      <td>{formatAmount(p.settlement)}</td>
                      <td className={`profit-cell ${Number(p.net_profit) >= 0 ? 'positive' : 'negative'}`}>{formatAmount(p.net_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Net Profit Charts */}
        {!netLoading && (netProfits?.periods?.length || 0) > 0 && (
          <div className="profit-charts" style={{ marginTop: '1.5rem' }}>
            {/* Net Profit by Period */}
            {(() => {
              const data = (netProfits?.periods || [])
                .slice()
                .sort((a, b) => new Date(a.start) - new Date(b.start))
                .map(p => ({
                  label: new Date(p.start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                  value: Number(p.net_profit || 0)
                }));

              const chartData = {
                labels: data.map(d => d.label),
                datasets: [
                  {
                    label: 'Net Profit by Period',
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.value >= 0 ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)'),
                    borderColor: data.map(d => d.value >= 0 ? 'rgba(40, 167, 69, 1)' : 'rgba(220, 53, 69, 1)'),
                    borderWidth: 1,
                  }
                ]
              };

              return (
                <div className="chart-card">
                  <div className="chart-title">Net Profit by Period</div>
                  <div className="chart-container">
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                </div>
              );
            })()}

            {/* Monthly Net Profit (by settlement date or end date) */}
            {(() => {
              const monthMap = new Map();
              (netProfits?.periods || []).forEach(p => {
                const keyDate = p.settlement_date || p.end || p.start;
                const dt = new Date(keyDate);
                const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
                const prev = monthMap.get(key) || 0;
                monthMap.set(key, prev + Number(p.net_profit || 0));
              });

              const rows = Array.from(monthMap.entries())
                .sort((a, b) => new Date(a[0] + '-01') - new Date(b[0] + '-01'))
                .map(([key, sum]) => ({
                  label: new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                  value: Number(sum || 0)
                }));

              const chartData = {
                labels: rows.map(r => r.label),
                datasets: [
                  {
                    label: 'Monthly Net Profit',
                    data: rows.map(r => r.value),
                    backgroundColor: rows.map(r => r.value >= 0 ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)'),
                    borderColor: rows.map(r => r.value >= 0 ? 'rgba(40, 167, 69, 1)' : 'rgba(220, 53, 69, 1)'),
                    borderWidth: 1,
                  }
                ]
              };

              return (
                <div className="chart-card">
                  <div className="chart-title">Monthly Net Profit</div>
                  <div className="chart-container">
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profit;
