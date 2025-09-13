import express from 'express';
import { getRevenueForPeriod, getNetProfitsBySettlements } from '../controllers/exploreController.js';

const router = express.Router();

// GET /api/explore/canteen/:canteenId/revenue?start=...&end=...
router.get('/canteen/:canteenId/revenue', getRevenueForPeriod);

// GET /api/explore/canteen/:canteenId/net-profits
// Optional filters: ?start=YYYY-MM-DD&end=YYYY-MM-DD (limits settlements considered)
router.get('/canteen/:canteenId/net-profits', getNetProfitsBySettlements);

export default router;


