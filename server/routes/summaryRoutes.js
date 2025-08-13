import express from 'express'
import { verifyJWT } from '../controllers/authController.js'
import { fetchSummary } from '../controllers/summaryController.js'

const router = express.Router()

router.use(verifyJWT)

router.get('/', fetchSummary)

export default router


