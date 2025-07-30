import { getAllPayouts } from '../models/payoutModel.js';

export async function fetchPayouts(req, res) {
  try {
    const payouts = await getAllPayouts();
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payouts', error: error.message });
  }
}