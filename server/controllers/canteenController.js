import { getAllCanteens } from '../models/canteenModel.js'
import { getDailyRevenueByCanteen } from '../models/ordersModel.js'
import { upsertPayoutRecord, getPayoutsMapByCanteen, setPayoutStatus, getPayoutByKey } from '../models/payoutsModel.js'
import { createTransaction } from '../models/transactionModel.js'

export async function fetchCanteens(req, res) {
  try {
    const canteens = await getAllCanteens()
    res.json(canteens)
  } catch (err) {
    console.error('Error fetching canteens:', err)
    res.status(500).json({ error: 'Failed to fetch canteens', details: err.message })
  }
}

export async function fetchCanteenSettlements(req, res) {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'CanteenId is required' })
    const rows = await getDailyRevenueByCanteen(id)
    
    // First, upsert all payout amounts
    for (const r of rows) {
      const orderDate = new Date(r.order_date)
      const ymd = orderDate.toISOString().slice(0,10)
      const amountInt = Number(r.net_payout || 0)
      try {
        await upsertPayoutRecord({ canteenId: Number(id), payoutDate: ymd, amount: amountInt })
      } catch (_) {}
    }
    
    // Then fetch the updated payout map with all statuses
    let payoutMap = new Map()
    try {
      payoutMap = await getPayoutsMapByCanteen(id)
    } catch (_) {
      payoutMap = new Map()
    }
    
    // Finally, enrich the data with the correct statuses
    const enriched = []
    for (const r of rows) {
      const orderDate = new Date(r.order_date)
      const ymd = orderDate.toISOString().slice(0,10)
      const amountInt = Number(r.net_payout || 0)
      const existing = payoutMap.get(ymd)
      enriched.push({
        ...r,
        payout_amount: amountInt,
        status: existing?.status || 'unsettled',
        settled_at: existing?.settled_at || null
      })
    }
    res.json(enriched)
  } catch (err) {
    console.error('Error fetching canteen settlements:', err)
    res.status(500).json({ error: 'Failed to fetch settlements', details: err.message })
  }
}

export async function setPayoutPaid(req, res) {
  try {
    const { id } = req.params
    const { date, status, settlementDate } = req.body || {}
    if (!id) return res.status(400).json({ error: 'CanteenId is required' })
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' })
    
    try {
      // Check current status before making changes
      const currentPayout = await getPayoutByKey({ canteenId: Number(id), payoutDate: date })
      
      // Prevent unsettling if already settled
      if (currentPayout && currentPayout.status === 'settled' && status === 'unsettled') {
        return res.status(400).json({ 
          error: 'Cannot unsettle an already settled payout',
          message: 'Once a payout is settled, it cannot be reversed'
        })
      }
      
      // Only allow settling (not unsettling)
      if (status !== 'settled') {
        return res.status(400).json({ 
          error: 'Invalid operation',
          message: 'Only settling payouts is allowed'
        })
      }
      
      await setPayoutStatus({ canteenId: Number(id), payoutDate: date, status: 'settled' })
      const updated = await getPayoutByKey({ canteenId: Number(id), payoutDate: date })
      
      // Create a debit transaction for the settlement
      if (updated) {
        try {
          // Get canteen name for transaction description
          const canteens = await getAllCanteens()
          const canteen = canteens.find(c => c.CanteenId === Number(id))
          const canteenName = canteen ? canteen.CanteenName : `Canteen ${id}`
          
          // Use settlement date if provided, otherwise use current date
          const transactionDate = settlementDate || new Date().toISOString().split('T')[0]
          
          await createTransaction({
            date: transactionDate,
            description: `Canteen Payout - ${canteenName} (${date})`,
            transaction_type: 'debit',
            amount: updated.amount || 0,
            source: 'canteen_payout'
          })
          
          console.log(`Created debit transaction for canteen ${id} payout on ${date}, settled on ${transactionDate}: ₹${updated.amount}`)
        } catch (transactionErr) {
          console.error('Error creating settlement transaction:', transactionErr)
          // Don't fail the settlement if transaction creation fails
        }
      }
      
      return res.json({ success: true, payout: updated })
    } catch (err) {
      return res.status(400).json({ error: 'payouts table missing or schema mismatch', details: err.message })
    }
  } catch (err) {
    console.error('Error marking payout paid:', err)
    res.status(500).json({ error: 'Failed to update payout status', details: err.message })
  }
}

export async function syncCanteenPayouts(req, res) {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'CanteenId is required' })
    const rows = await getDailyRevenueByCanteen(id)
    for (const r of rows) {
      const ymd = new Date(r.order_date).toISOString().slice(0,10)
      const amountInt = Number(r.net_payout || 0)
      try {
        await upsertPayoutRecord({ canteenId: Number(id), payoutDate: ymd, amount: amountInt })
      } catch (_) { /* ignore if payouts table missing */ }
    }
    res.json({ success: true, count: rows.length })
  } catch (err) {
    console.error('Error syncing canteen payouts:', err)
    res.status(500).json({ error: 'Failed to sync payouts', details: err.message })
  }
}


