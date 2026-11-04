import express from 'express';
import { getStudent, getStudents } from '../controllers/mentorController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRole('mentor', 'admin'));

router.get('/students', getStudents);
router.get('/students/:id', getStudent);

export default router;
