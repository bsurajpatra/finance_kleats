import express from 'express'
import { fetchCanteens, fetchCanteenSettlements, setPayoutPaid, syncCanteenPayouts } from '../controllers/canteenController.js'

const router = express.Router()

router.get('/', fetchCanteens)
router.get('/:id/settlements', fetchCanteenSettlements)
router.post('/:id/settlements/paid', setPayoutPaid)
router.post('/:id/settlements/sync', syncCanteenPayouts)

export default router


