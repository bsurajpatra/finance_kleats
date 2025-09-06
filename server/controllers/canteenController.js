import { getAllCanteens } from '../models/canteenModel.js'
import { getDailyRevenueByCanteen } from '../models/ordersModel.js'
import { upsertPayoutRecord, getPayoutsMapByCanteen, setPayoutStatus, getPayoutByKey } from '../models/payoutsModel.js'
import { createTransaction, checkExistingPayoutTransaction } from '../models/transactionModel.js'

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
    
    // Get existing payout map first to avoid unnecessary upserts
    let payoutMap = new Map()
    try {
      payoutMap = await getPayoutsMapByCanteen(id)
    } catch (_) {
      payoutMap = new Map()
    }
    
    // DO NOT update settled records - they represent the amount at time of settlement
    // Settled amounts should remain fixed once settled
    // Only calculate unsettled amounts on-the-fly (not stored in database)
    
    // Note: We don't create or update any records here - settled records are immutable
    // and unsettled records are calculated on-the-fly from the order data
    
    // Fetch the updated payout map after any changes
    try {
      payoutMap = await getPayoutsMapByCanteen(id)
    } catch (_) {
      payoutMap = new Map()
    }
    
    // Enrich the data with the correct statuses
    const enriched = []
    for (const r of rows) {
      const orderDate = new Date(r.order_date)
      const ymd = orderDate.toISOString().slice(0,10)
      const amountInt = Number(r.net_payout || 0)
      const existing = payoutMap.get(ymd)
      enriched.push({
        ...r,
        payout_amount: existing?.status === 'settled' ? existing.amount : amountInt,
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
      
      // Prevent settling if already settled
      if (currentPayout && currentPayout.status === 'settled') {
        return res.status(400).json({ 
          error: 'Payout already settled',
          message: 'This payout has already been settled and cannot be settled again',
          payout: currentPayout
        })
      }
      
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
      
      // Get the current payout amount from order data before settling
      const orderData = await getDailyRevenueByCanteen(id)
      const orderDate = new Date(date)
      const ymd = orderDate.toISOString().slice(0,10)
      const orderPayout = orderData.find(r => {
        const orderDateStr = new Date(r.order_date).toISOString().slice(0,10)
        return orderDateStr === ymd
      })
      const payoutAmount = orderPayout ? Number(orderPayout.net_payout || 0) : 0
      
      await setPayoutStatus({ canteenId: Number(id), payoutDate: date, status: 'settled', amount: payoutAmount })
      const updated = await getPayoutByKey({ canteenId: Number(id), payoutDate: date })
      
      // Create a debit transaction for the settlement (only if not already created)
      if (updated) {
        try {
          // Get canteen name for transaction description
          const canteens = await getAllCanteens()
          const canteen = canteens.find(c => c.CanteenId === Number(id))
          const canteenName = canteen ? canteen.CanteenName : `Canteen ${id}`
          
          // Use settlement date if provided, otherwise use current date
          const transactionDate = settlementDate || new Date().toISOString().split('T')[0]
          
          // Check if transaction already exists to prevent duplicates
          const existingTransaction = await checkExistingPayoutTransaction({
            canteenId: Number(id),
            payoutDate: date,
            amount: updated.amount || 0
          })
          
          if (!existingTransaction) {
            await createTransaction({
              date: transactionDate,
              description: `Canteen Payout - ${canteenName} (${date})`,
              transaction_type: 'debit',
              amount: updated.amount || 0,
              source: 'canteen_payout'
            })
            
            console.log(`Created debit transaction for canteen ${id} payout on ${date}, settled on ${transactionDate}: ₹${updated.amount}`)
          } else {
            console.log(`Transaction already exists for canteen ${id} payout on ${date}, skipping creation`)
          }
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
    
    // This function should NOT create or update any records
    // Settled records are immutable, unsettled records are calculated on-the-fly
    // This endpoint is now just for informational purposes
    
    const rows = await getDailyRevenueByCanteen(id)
    res.json({ 
      success: true, 
      count: rows.length,
      message: 'Sync completed - no records created/updated (settled records are immutable, unsettled are calculated on-the-fly)'
    })
  } catch (err) {
    console.error('Error syncing canteen payouts:', err)
    res.status(500).json({ error: 'Failed to sync payouts', details: err.message })
  }
}


