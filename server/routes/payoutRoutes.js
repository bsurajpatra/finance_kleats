import express from 'express';
import { fetchPayouts, deletePayoutController, updatePayoutController, createPayoutController } from '../controllers/payoutController.js';
import { verifyJWT } from '../controllers/authController.js';

const router = express.Router();

router.get('/', verifyJWT, fetchPayouts);
router.post('/', verifyJWT, createPayoutController);
router.put('/:id', verifyJWT, updatePayoutController);
router.delete('/:id', verifyJWT, deletePayoutController);

export default router;