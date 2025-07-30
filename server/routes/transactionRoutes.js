import express from 'express'
import { fetchTransactions, addTransaction } from '../controllers/transactionController.js'
import { verifyJWT } from '../controllers/authController.js'

const router = express.Router()

router.get('/', fetchTransactions)
router.post('/', verifyJWT, addTransaction)

export default router 