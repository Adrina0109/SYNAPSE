import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    confirmAnnouncementTasks,
    createAnnouncement,
    deleteAnnouncement,
    dismissAnnouncement,
    extractAnnouncementTasks,
    getAnnouncementInbox,
    getSentAnnouncements,
} from '../controllers/announcementController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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

router.post('/', requireRole('mentor', 'admin'), createAnnouncement);
router.get('/sent', requireRole('mentor', 'admin'), getSentAnnouncements);
router.delete('/:id', requireRole('mentor', 'admin'), deleteAnnouncement);

router.get('/inbox', requireRole('student'), getAnnouncementInbox);
router.post('/:id/extract', requireRole('student'), extractionLimiter, extractAnnouncementTasks);
router.post('/:id/confirm', requireRole('student'), confirmAnnouncementTasks);
router.post('/:id/dismiss', requireRole('student'), dismissAnnouncement);

export default router;
