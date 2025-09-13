import cashfreeService from '../services/cashfreeService.js';
import fetch from 'node-fetch';

function normalizeDateTime(value, isStart) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return isStart ? `${value} 00:00:00` : `${value} 23:59:59`;
  }
  return value.replace('T', ' ');
}

function getExternalExploreBase() {
  const host = process.env.MYSQL_HOST;
  const port = process.env.PORT;
  return `http://${host}:${port}`;
}

async function fetchExternalRevenue(canteenId, startRaw, endRaw) {
  const base = getExternalExploreBase();
  const baseUrl = `${base}/api/explore/canteen/${encodeURIComponent(canteenId)}/revenue`;

  // Try GET with common param names (include both canteen_id and canteenId)
  const url1 = `${baseUrl}?canteen_id=${encodeURIComponent(canteenId)}&canteenId=${encodeURIComponent(canteenId)}&start=${encodeURIComponent(startRaw)}&end=${encodeURIComponent(endRaw)}`;
  let resp = await fetch(url1);
  if (resp.ok) return await resp.json();

  // Retry GET with alternate param names (start_date/end_date)
  const url2 = `${baseUrl}?canteen_id=${encodeURIComponent(canteenId)}&start_date=${encodeURIComponent(startRaw)}&end_date=${encodeURIComponent(endRaw)}`;
  resp = await fetch(url2);
  if (resp.ok) return await resp.json();

  // Final fallback: POST with JSON body
  resp = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ canteen_id: canteenId, start: startRaw, end: endRaw })
  });
  if (resp.ok) return await resp.json();

  const text = await resp.text();
  throw new Error(`External revenue fetch failed: ${resp.status} ${resp.statusText} - ${text}`);
}

export async function getRevenueForPeriod(req, res) {
  try {
    const { canteenId } = req.params;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end are required' });
    }

    const ext = await fetchExternalRevenue(canteenId, start, end);
    return res.json(ext);
  } catch (err) {
    console.error('getRevenueForPeriod error:', err);
    return res.status(500).json({ error: 'Failed to fetch revenue' });
  }
}

export async function getNetProfitsBySettlements(req, res) {
  try {
    const { canteenId } = req.params;
    const { start: filterStart, end: filterEnd } = req.query;

    const settlements = await cashfreeService.fetchAllSettlements({
      ...(filterStart && { start_date: filterStart }),
      ...(filterEnd && { end_date: filterEnd }),
    });

    const items = (Array.isArray(settlements) ? settlements : []).map((s) => s?.settlement_details || {});

    const periods = items
      .filter((d) => d.payment_from && d.payment_till)
      .map((d) => ({
        from: d.payment_from,
        till: d.payment_till,
        amount_settled: Number(d.amount_settled || 0),
        utr: d.utr || null,
        settlement_date: d.settlement_date || null,
      }))
      .sort((a, b) => new Date(a.from) - new Date(b.from));

    const periodResults = [];
    for (const p of periods) {
      const startDt = normalizeDateTime(p.from, true);
      const endDt = normalizeDateTime(p.till, false);

      const ext = await fetchExternalRevenue(canteenId, startDt, endDt);
      const revenue = Number(ext?.revenue || 0);
      const net_profit = revenue - p.amount_settled;
      periodResults.push({
        canteenId,
        start: ext?.start || startDt,
        end: ext?.end || endDt,
        revenue,
        settlement: p.amount_settled,
        net_profit,
        utr: p.utr,
        settlement_date: p.settlement_date,
      });
    }

    const totals = periodResults.reduce(
      (acc, r) => {
        acc.revenue += r.revenue;
        acc.settlement += r.settlement;
        acc.net_profit += r.net_profit;
        return acc;
      },
      { revenue: 0, settlement: 0, net_profit: 0 }
    );

    return res.json({
      canteenId,
      totals,
      periods: periodResults,
      count: periodResults.length,
    });
  } catch (err) {
    console.error('getNetProfitsBySettlements error:', err);
    return res.status(500).json({ error: 'Failed to compute net profits' });
  }
}


