import express from 'express';
import { fetchPayouts, deletePayoutController } from '../controllers/payoutController.js';
import { verifyJWT } from '../controllers/authController.js';

const router = express.Router();

router.get('/', verifyJWT, fetchPayouts);
router.delete('/:id', verifyJWT, deletePayoutController);

export default router;