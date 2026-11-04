import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    confirmAnnouncement,
    extractAnnouncement,
    getAnnouncements,
} from '../controllers/announcementController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const extractionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: {
        success: false,
        message: 'Too many announcement extraction requests. Please wait before trying again.',
    },
});

router.use(requireAuth);

router.post('/extract', extractionLimiter, extractAnnouncement);
router.post('/:id/confirm', confirmAnnouncement);
router.get('/', getAnnouncements);

export default router;
