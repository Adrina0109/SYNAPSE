import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { updateProfile } from '../controllers/userController.js';

const router = express.Router();

// Only students can update their profile (for onboarding)
router.patch('/me/profile', requireAuth, requireRole('student', 'mentor', 'admin'), updateProfile);

export default router;
