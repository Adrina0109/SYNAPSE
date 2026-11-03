import express from 'express';
import rateLimit from 'express-rate-limit';
import { signup, login, logout, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many attempts from this IP. Please wait 15 minutes before trying again.',
    },
    skipSuccessfulRequests: false,
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
