import express from 'express';
import { getNotifications, markNotificationRead } from '../controllers/notificationController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRole('student'));

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;
