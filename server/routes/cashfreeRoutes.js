import express from 'express';
import { 
  fetchCashfreeSettlements, 
  fetchAllCashfreeSettlements, 
  getSettlementsByDateRange 
} from '../controllers/cashfreeController.js';

const router = express.Router();

// GET /api/cashfree/settlements - Fetch settlements with pagination
router.get('/settlements', fetchCashfreeSettlements);

// GET /api/cashfree/settlements/all - Fetch all settlements (with pagination handled internally)
router.get('/settlements/all', fetchAllCashfreeSettlements);

// GET /api/cashfree/settlements/:start_date/:end_date - Fetch settlements by date range
router.get('/settlements/:start_date/:end_date', getSettlementsByDateRange);

export default router;
