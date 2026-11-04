import express from 'express';
import rateLimit from 'express-rate-limit';
import { askAssistant } from '../controllers/assistantController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const askLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: {
        success: false,
        message: 'Too many assistant requests. Please wait before trying again.',
    },
});

router.use(requireAuth);
router.post('/ask', requireRole('student'), askLimiter, askAssistant);

export default router;
