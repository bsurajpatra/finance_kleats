import cashfreeService from '../services/cashfreeService.js';

export async function fetchCashfreeSettlements(req, res) {
  try {
    const { start_date, end_date, limit, cursor } = req.query;
    
    const filters = {};
    const pagination = {};

    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (limit) pagination.limit = parseInt(limit);
    if (cursor) pagination.cursor = cursor;

    const settlements = await cashfreeService.fetchSettlements(filters, pagination);

    const items = Array.isArray(settlements?.data) ? settlements.data : [];
    const mapped = items.map((item) => {
      const details = item?.settlement_details || {};
      return {
        amount_settled: details.amount_settled ?? null,
        payment_from: details.payment_from ?? null,
        payment_till: details.payment_till ?? null,
      };
    });

    res.json({
      success: true,
      data: mapped,
      pagination: settlements.pagination || {}
    });
  } catch (error) {
    console.error('Error fetching Cashfree settlements:', error);
    res.status(500).json({ 
      error: 'Failed to fetch settlements', 
      details: error.message 
    });
  }
}

export async function fetchAllCashfreeSettlements(req, res) {
  try {
    const { start_date, end_date } = req.query;
    
    const filters = {};
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const settlements = await cashfreeService.fetchAllSettlements(filters);

    const mapped = (Array.isArray(settlements) ? settlements : []).map((item) => {
      const details = item?.settlement_details || {};
      return {
        amount_settled: details.amount_settled ?? null,
        payment_from: details.payment_from ?? null,
        payment_till: details.payment_till ?? null,
      };
    });
    
    res.json({
      success: true,
      data: mapped,
      count: mapped.length
    });
  } catch (error) {
    console.error('Error fetching all Cashfree settlements:', error);
    res.status(500).json({ 
      error: 'Failed to fetch all settlements', 
      details: error.message 
    });
  }
}

export async function getSettlementsByDateRange(req, res) {
  try {
    const { start_date, end_date } = req.params;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Both start_date and end_date are required (YYYY-MM-DD format)' 
      });
    }

    const settlements = await cashfreeService.getSettlementsByDateRange(
      `${start_date}T00:00:00Z`, 
      `${end_date}T23:59:59Z`
    );

    const mapped = (Array.isArray(settlements) ? settlements : []).map((item) => {
      const details = item?.settlement_details || {};
      return {
        amount_settled: details.amount_settled ?? null,
        payment_from: details.payment_from ?? null,
        payment_till: details.payment_till ?? null,
      };
    });

    res.json({
      success: true,
      data: mapped,
      count: mapped.length,
      dateRange: { start_date, end_date }
    });
  } catch (error) {
    console.error('Error fetching settlements by date range:', error);
    res.status(500).json({ 
      error: 'Failed to fetch settlements by date range', 
      details: error.message 
    });
  }
}
