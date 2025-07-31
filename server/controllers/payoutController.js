import { getAllPayouts, deletePayout, updatePayout, createPayout } from '../models/payoutModel.js';

export async function fetchPayouts(req, res) {
  try {
    const payouts = await getAllPayouts();
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payouts', error: error.message });
  }
}

export async function createPayoutController(req, res) {
  try {
    const { date, funds_released } = req.body;
    
    if (!date || !funds_released) {
      return res.status(400).json({ error: 'Date and funds_released are required' });
    }
    
    const payoutData = {
      date,
      funds_released: Number(funds_released)
    };
    
    console.log('Creating payout:', payoutData);
    
    const newPayout = await createPayout(payoutData);
    
    console.log('Payout created successfully');
    
    res.status(201).json(newPayout);
  } catch (err) {
    console.error('Error creating payout:', err);
    res.status(500).json({ error: 'Failed to create payout', details: err.message });
  }
}

export async function updatePayoutController(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Updating payout:', id, updateData);
    
    const updatedPayout = await updatePayout(id, updateData);
    console.log('Payout updated successfully');
    
    res.json(updatedPayout);
  } catch (err) {
    console.error('Error updating payout:', err);
    res.status(500).json({ error: 'Failed to update payout', details: err.message });
  }
}

export async function deletePayoutController(req, res) {
  try {
    const { id } = req.params;
    
    console.log('Deleting payout:', id);
    
    await deletePayout(id);
    console.log('Payout deleted successfully');
    
    res.json({ success: true, message: 'Payout deleted successfully' });
  } catch (err) {
    console.error('Error deleting payout:', err);
    res.status(500).json({ error: 'Failed to delete payout', details: err.message });
  }
}