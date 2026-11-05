import express from 'express';
import {
    broadcastTask,
    getMentorAnalytics,
    getStudent,
    getStudentSummary,
    getStudents,
} from '../controllers/mentorController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRole('mentor', 'admin'));

router.get('/analytics', getMentorAnalytics);
router.post('/broadcast', broadcastTask);
router.get('/students', getStudents);
router.post('/students/:id/summary', getStudentSummary);
router.get('/students/:id', getStudent);

export default router;
