import express from 'express'
import { verifyJWT } from '../controllers/authController.js'
import { fetchSummary, getDailyProfitController } from '../controllers/summaryController.js'

const router = express.Router()

router.use(verifyJWT)

router.get('/', fetchSummary)
router.get('/profit/:canteenId', getDailyProfitController)

export default router


