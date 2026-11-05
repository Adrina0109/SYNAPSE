import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    deleteRoadmap,
    generateDayNotes,
    generateRoadmap,
    getRoadmap,
    getRoadmaps,
    saveRoadmap,
    toggleRoadmapDay,
} from '../controllers/roadmapController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const generationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: {
        success: false,
        message: 'Too many roadmap requests. Please wait before trying again.',
    },
});

const notesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: {
        success: false,
        message: 'Too many roadmap notes requests. Please wait before trying again.',
    },
});

router.use(requireAuth, requireRole('student'));

router.post('/generate', generationLimiter, generateRoadmap);
router.post('/', saveRoadmap);
router.get('/', getRoadmaps);
router.get('/:id', getRoadmap);
router.patch('/:id/days/:dayNumber/toggle', toggleRoadmapDay);
router.post('/:id/days/:dayNumber/notes', notesLimiter, generateDayNotes);
router.delete('/:id', deleteRoadmap);

export default router;
