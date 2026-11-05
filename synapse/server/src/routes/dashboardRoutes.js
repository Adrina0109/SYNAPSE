import express from 'express';
import { getStudentDashboard } from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/student', requireAuth, requireRole('student'), getStudentDashboard);

export default router;
