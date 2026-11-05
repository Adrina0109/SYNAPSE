import express from 'express';
import { getStudentDashboard } from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import noStore from '../middleware/noStore.js';

const router = express.Router();

router.get('/student', requireAuth, requireRole('student'), noStore, getStudentDashboard);

export default router;
