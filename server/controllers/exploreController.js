import cashfreeService from '../services/cashfreeService.js';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

function normalizeDateTime(value, isStart) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return isStart ? `${value} 00:00:00` : `${value} 23:59:59`;
  }
  return value.replace('T', ' ');
}

function getExternalExploreBase() {
  const baseUrl = process.env.EXTERNAL_KLEATS_API_URL;
  console.log('Environment EXTERNAL_KLEATS_API_URL:', process.env.EXTERNAL_KLEATS_API_URL);
  console.log('Using base URL:', baseUrl);
  return baseUrl;
}

async function fetchExternalRevenue(canteenId, startRaw, endRaw) {
  const base = getExternalExploreBase();
  const url = `${base}/api/explore/canteen/${encodeURIComponent(canteenId)}/revenue?start=${encodeURIComponent(startRaw)}&end=${encodeURIComponent(endRaw)}`;
  
  console.log('Fetching external revenue from:', url);
  
  const fetchOptions = {};
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    console.log('Using proxy:', proxyUrl);
    fetchOptions.agent = new HttpsProxyAgent(proxyUrl);
  }
  
  const resp = await fetch(url, fetchOptions);
  if (!resp.ok) {
    const text = await resp.text();
    console.error('External revenue fetch failed:', resp.status, resp.statusText, text);
    throw new Error(`External revenue fetch failed: ${resp.status} ${resp.statusText} - ${text}`);
  }
  
  const data = await resp.json();
  console.log('External revenue response:', data);
  
  if (data.code === 1 && data.data) {
    return {
      canteenId: data.data.canteenId,
      start: data.data.start,
      end: data.data.end,
      revenue: data.data.canteen_total || data.data.full_total || 0,
      orders: data.data.orderCount || 0
    };
  }
  
  throw new Error(`Invalid response format from external API: ${JSON.stringify(data)}`);
}

export async function getRevenueForPeriod(req, res) {
  try {
    const { canteenId } = req.params;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end are required' });
    }

    // Handle "all" canteen case
    if (canteenId === 'all') {
      const { getAllCanteens } = await import('../models/canteenModel.js');
      const canteens = await getAllCanteens();
      const canteenIds = canteens.map(c => c.CanteenId.toString());
      
      let totalRevenue = 0;
      let totalOrders = 0;
      let errors = [];
      
      for (const cid of canteenIds) {
        try {
          const ext = await fetchExternalRevenue(cid, start, end);
          totalRevenue += Number(ext?.revenue || 0);
          totalOrders += Number(ext?.orders || 0);
        } catch (err) {
          errors.push(`Canteen ${cid}: ${err.message}`);
        }
      }
      
      return res.json({
        canteenId: 'all',
        start,
        end,
        revenue: totalRevenue,
        orders: totalOrders,
        ...(errors.length > 0 && { errors })
      });
    } else {
      const ext = await fetchExternalRevenue(canteenId, start, end);
      return res.json(ext);
    }
  } catch (err) {
    console.error('getRevenueForPeriod error:', err);
    return res.status(500).json({ error: 'Failed to fetch revenue' });
  }
}

export async function getNetProfitsBySettlements(req, res) {
  try {
    const { canteenId } = req.params;
    const { start: filterStart, end: filterEnd } = req.query;
    
    console.log('=== getNetProfitsBySettlements START ===');
    console.log('canteenId:', canteenId);
    console.log('filterStart:', filterStart);
    console.log('filterEnd:', filterEnd);

    console.log('Fetching Cashfree settlements...');
    const settlements = await cashfreeService.fetchAllSettlements({
      ...(filterStart && { start_date: filterStart }),
      ...(filterEnd && { end_date: filterEnd }),
    });
    console.log('Raw settlements count:', settlements?.length || 0);

    const items = (Array.isArray(settlements) ? settlements : []).map((s) => s?.settlement_details || {});
    console.log('Settlement items count:', items.length);

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
    
    console.log('Valid settlement periods found:', periods.length);
    console.log('Periods:', periods.map(p => ({ from: p.from, till: p.till, amount: p.amount_settled })));

    const periodResults = [];
    
    // Handle "all" canteen case by fetching revenue for each available canteen
    let canteenIds = [];
    if (canteenId === 'all') {
      // Get all available canteens from database
      const { getAllCanteens } = await import('../models/canteenModel.js');
      const canteens = await getAllCanteens();
      canteenIds = canteens.map(c => c.CanteenId.toString());
      console.log('Found canteens for "all":', canteenIds);
    } else {
      canteenIds = [canteenId];
    }
    
    for (const p of periods) {
      const startDt = normalizeDateTime(p.from, true);
      const endDt = normalizeDateTime(p.till, false);
      
      console.log(`Processing period: ${startDt} to ${endDt}, settlement: ${p.amount_settled}`);

      let totalRevenue = 0;
      let revenueErrors = [];

      // Fetch revenue for each canteen and sum them up
      for (const cid of canteenIds) {
        try {
          const ext = await fetchExternalRevenue(cid, startDt, endDt);
          totalRevenue += Number(ext?.revenue || 0);
          console.log(`Canteen ${cid} revenue: ${ext?.revenue || 0}`);
        } catch (periodErr) {
          console.error(`Error fetching revenue for canteen ${cid}:`, periodErr.message);
          revenueErrors.push(`Canteen ${cid}: ${periodErr.message}`);
        }
      }

      const net_profit = totalRevenue - p.amount_settled;
      console.log(`Total revenue: ${totalRevenue}, Settlement: ${p.amount_settled}, Net Profit: ${net_profit}`);
      
      periodResults.push({
        canteenId,
        start: startDt,
        end: endDt,
        revenue: totalRevenue,
        settlement: p.amount_settled,
        net_profit,
        utr: p.utr,
        settlement_date: p.settlement_date,
        ...(revenueErrors.length > 0 && { errors: revenueErrors })
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

    console.log('Final totals:', totals);
    console.log('Period results count:', periodResults.length);
    console.log('=== getNetProfitsBySettlements END ===');

    return res.json({
      canteenId,
      totals,
      periods: periodResults,
      count: periodResults.length,
    });
  } catch (err) {
    console.error('getNetProfitsBySettlements error:', err);
    return res.status(500).json({ error: 'Failed to compute net profits', details: err.message });
  }
}


