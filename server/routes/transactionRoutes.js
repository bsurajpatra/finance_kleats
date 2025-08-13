import express from 'express'
import { fetchTransactions, addTransaction, updateTransactionController, deleteTransactionController } from '../controllers/transactionController.js'
import { verifyJWT } from '../controllers/authController.js'

const router = express.Router()

// Protect all transaction routes consistently at router level
router.use(verifyJWT)

router.get('/', fetchTransactions)
router.post('/', addTransaction)
router.put('/:id', updateTransactionController)
router.delete('/:id', deleteTransactionController)

export default router 