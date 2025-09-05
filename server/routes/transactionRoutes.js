import express from 'express'
import { fetchTransactions, addTransaction, updateTransactionController, deleteTransactionController, getTransactionByIdController, getTransactionsByDateRangeController, getTransactionsByTypeController, syncSettlementsToTransactions } from '../controllers/transactionController.js'
import { verifyJWT } from '../controllers/authController.js'

const router = express.Router()

// Protect all transaction routes consistently at router level
router.use(verifyJWT)

router.get('/', fetchTransactions)
router.post('/', addTransaction)
router.put('/:id', updateTransactionController)
router.delete('/:id', deleteTransactionController)
router.get('/id/:id', getTransactionByIdController)
router.get('/date-range', getTransactionsByDateRangeController)
router.get('/type/:transaction_type', getTransactionsByTypeController)
router.post('/sync-settlements', syncSettlementsToTransactions)

export default router 