import express from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicSummary } from '../controllers/shareController.js';

const router = express.Router();

const publicReadinessLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.',
    },
});

router.get('/readiness/:token', publicReadinessLimiter, getPublicSummary);

export default router;
