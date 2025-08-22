import express from 'express'
import { fetchCanteens, fetchCanteenSettlements } from '../controllers/canteenController.js'

const router = express.Router()

router.get('/', fetchCanteens)
router.get('/:id/settlements', fetchCanteenSettlements)

export default router


