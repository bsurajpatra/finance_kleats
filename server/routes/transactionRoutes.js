import express from 'express'
import { fetchTransactions, addTransaction, updateTransactionController, deleteTransactionController } from '../controllers/transactionController.js'
import { verifyJWT } from '../controllers/authController.js'

const router = express.Router()

router.get('/', fetchTransactions)
router.post('/', verifyJWT, addTransaction)
router.put('/:id', verifyJWT, updateTransactionController)
router.delete('/:id', verifyJWT, deleteTransactionController)

export default router 