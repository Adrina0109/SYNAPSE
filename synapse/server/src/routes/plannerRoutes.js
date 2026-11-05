import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    applyReplanHandler,
    getCapacity,
    getConflicts,
    previewReplanHandler,
} from '../controllers/plannerController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const plannerWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: {
        success: false,
        message: 'Too many planner requests. Please wait before trying again.',
    },
});

router.use(requireAuth, requireRole('student'));

router.get('/capacity', getCapacity);
router.get('/conflicts', getConflicts);
router.post('/replan/preview', plannerWriteLimiter, previewReplanHandler);
router.post('/replan/apply', plannerWriteLimiter, applyReplanHandler);

export default router;
