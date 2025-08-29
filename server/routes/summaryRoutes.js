import express from 'express'
import { verifyJWT } from '../controllers/authController.js'
import { fetchSummary, getDailyNetProfitController } from '../controllers/summaryController.js'

const router = express.Router()

router.use(verifyJWT)

router.get('/', fetchSummary)
router.get('/net-profit/:canteenId', getDailyNetProfitController)

export default router


