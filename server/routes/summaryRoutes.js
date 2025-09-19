import express from 'express'
import { verifyJWT } from '../controllers/authController.js'
import { 
  fetchSummary, 
  getDailyProfitController, 
  getTodaysGrossProfitController,
  getAllGrossProfitHistoryController,
  populateHistoricalDataController
} from '../controllers/summaryController.js'

const router = express.Router()

router.use(verifyJWT)

router.get('/', fetchSummary)
router.get('/profit/:canteenId', getDailyProfitController)
router.get('/gross-profit/today', getTodaysGrossProfitController)
router.get('/gross-profit/history', getAllGrossProfitHistoryController)
router.post('/gross-profit/populate/:canteenId', populateHistoricalDataController)

export default router


