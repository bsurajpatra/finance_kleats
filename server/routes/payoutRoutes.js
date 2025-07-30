import express from 'express';
import { fetchPayouts } from '../controllers/payoutController.js';
import { verifyJWT } from '../controllers/authController.js';

const router = express.Router();

router.get('/', verifyJWT, fetchPayouts);

export default router;