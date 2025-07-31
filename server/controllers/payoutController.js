import { getAllPayouts, deletePayout } from '../models/payoutModel.js';

export async function fetchPayouts(req, res) {
  try {
    const payouts = await getAllPayouts();
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payouts', error: error.message });
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