import express from 'express'
import { fetchTransactions } from '../controllers/transactionController.js'

const router = express.Router()

router.get('/', fetchTransactions)

export default router 