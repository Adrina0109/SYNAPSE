import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    addMockHandler,
    getChecklistHandler,
    getHistoryHandler,
    getReadinessHandler,
    getWhatIfHandler,
    toggleChecklistHandler,
} from '../controllers/placementController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const placementWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: {
        success: false,
        message: 'Too many requests. Please wait before trying again.',
    },
});

router.use(requireAuth);

router.get('/readiness', requireRole('student'), getReadinessHandler);
router.get('/readiness/whatif/:roadmapId', requireRole('student'), getWhatIfHandler);
router.get('/readiness/history', requireRole('student'), getHistoryHandler);
router.get('/checklist', requireRole('student'), getChecklistHandler);
router.patch('/checklist/:key', requireRole('student'), placementWriteLimiter, toggleChecklistHandler);
router.post('/mock/:studentId', requireRole('mentor', 'admin'), placementWriteLimiter, addMockHandler);

export default router;
