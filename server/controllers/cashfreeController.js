import cashfreeService from '../services/cashfreeService.js';

export async function fetchCashfreeSettlements(req, res) {
  try {
    let { start_date, end_date, limit, cursor } = req.query;

    // If no dates provided, default to last 30 days
    if (!start_date || !end_date) {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 30);

      start_date = past.toISOString().split('T')[0] + 'T00:00:00Z';
      end_date = now.toISOString().split('T')[0] + 'T23:59:59Z';
    } else {
      if (!start_date.includes('T')) start_date += 'T00:00:00Z';
      if (!end_date.includes('T')) end_date += 'T23:59:59Z';
    }

    const filters = { start_date, end_date };
    const pagination = {};
    if (limit) pagination.limit = parseInt(limit);
    if (cursor) pagination.cursor = cursor;

    const settlements = await cashfreeService.fetchSettlements(filters, pagination);

    const mapped = (Array.isArray(settlements?.data) ? settlements.data : []).map((item) => {
      const details = item?.settlement_details || {};

      // Try to find the best date for 'Settled At'
      const transferTime = details.settlement_date || details.settlement_initiated_on || item.created_at || null;

      return {
        amount_settled: details.amount_settled ?? null,
        payment_from: details.payment_from ?? null,
        payment_till: details.payment_till ?? null,
        transfer_time: transferTime,
        settled_at: details.settlement_initiated_on || null,
        transfer_utr: details.utr ?? item.cf_settlement_id ?? null,
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
    let { start_date, end_date } = req.query;

    // If no dates provided, default to last 30 days
    if (!start_date || !end_date) {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 30);

      start_date = past.toISOString().split('T')[0] + 'T00:00:00Z';
      end_date = now.toISOString().split('T')[0] + 'T23:59:59Z';
    } else {
      // Ensure ISO format if they are plain dates
      if (!start_date.includes('T')) start_date += 'T00:00:00Z';
      if (!end_date.includes('T')) end_date += 'T23:59:59Z';
    }

    const filters = { start_date, end_date };
    console.log('Fetching Cashfree settlements with filters:', filters);

    const settlements = await cashfreeService.fetchAllSettlements(filters);

    const mapped = (Array.isArray(settlements) ? settlements : []).map((item) => {
      const details = item?.settlement_details || {};

      // Try to find the best date for 'Settled At'
      const transferTime = details.settlement_date || details.settlement_initiated_on || item.created_at || null;

      return {
        amount_settled: details.amount_settled ?? null,
        payment_from: details.payment_from ?? null,
        payment_till: details.payment_till ?? null,
        transfer_time: transferTime,
        settled_at: details.settlement_initiated_on || null,
        transfer_utr: details.utr ?? item.cf_settlement_id ?? null,
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

      // Try to find the best date for 'Settled At'
      const transferTime = details.settlement_date || details.settlement_initiated_on || item.created_at || null;

      return {
        amount_settled: details.amount_settled ?? null,
        payment_from: details.payment_from ?? null,
        payment_till: details.payment_till ?? null,
        transfer_time: transferTime,
        settled_at: details.settlement_initiated_on || null,
        transfer_utr: details.utr ?? item.cf_settlement_id ?? null,
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
