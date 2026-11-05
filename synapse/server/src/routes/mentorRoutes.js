import express from 'express';
import {
    broadcastTask,
    getMentorAnalytics,
    getRecipients,
    getStudent,
    getStudentSummary,
    getStudents,
} from '../controllers/mentorController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import noStore from '../middleware/noStore.js';

const router = express.Router();

router.use(requireAuth, requireRole('mentor', 'admin'));

router.get('/analytics', noStore, getMentorAnalytics);
router.get('/recipients', noStore, getRecipients);
router.post('/broadcast', broadcastTask);
router.get('/students', noStore, getStudents);
router.post('/students/:id/summary', getStudentSummary);
router.get('/students/:id', noStore, getStudent);

export default router;
