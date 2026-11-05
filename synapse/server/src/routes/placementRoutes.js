import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import {
    createDrive,
    deleteDrive,
    listDrives,
    updateDrive,
} from '../controllers/driveController.js';
import {
    addMockHandler,
    getChecklistHandler,
    getHistoryHandler,
    getReadinessHandler,
    getWhatIfHandler,
    resumeGap,
    resumeToRoadmap,
    toggleChecklistHandler,
} from '../controllers/placementController.js';
import { createShare, revokeShare } from '../controllers/shareController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const resumeUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
        const allowedTypes = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
        };
        if (allowedTypes[extension] !== file.mimetype) {
            const error = new Error('Upload a PDF or TXT file.');
            error.statusCode = 400;
            return callback(error);
        }
        callback(null, true);
    },
});

const resumeRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: {
        success: false,
        message: 'Too many resume requests. Please wait before trying again.',
    },
});

const handleResumeUpload = (req, res, next) => {
    resumeUpload.single('resume')(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            error.statusCode = 413;
            error.message = 'Resume file must be 2 MB or smaller.';
        }
        if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
            error.statusCode = 400;
            error.message = 'Upload a single file using the "resume" field.';
        }
        next(error);
    });
};

const placementWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: {
        success: false,
        message: 'Too many requests. Please wait before trying again.',
    },
});

router.use(requireAuth);

router.get('/drives', requireRole('student', 'mentor', 'admin'), listDrives);
router.post('/drives', requireRole('mentor', 'admin'), createDrive);
router.patch('/drives/:id', requireRole('mentor', 'admin'), updateDrive);
router.delete('/drives/:id', requireRole('mentor', 'admin'), deleteDrive);

router.post('/resume-gap', requireRole('student'), resumeRateLimiter, handleResumeUpload, resumeGap);
router.post('/resume-gap/to-roadmap', requireRole('student'), resumeRateLimiter, resumeToRoadmap);

router.get('/readiness', requireRole('student'), getReadinessHandler);
router.post('/share', requireRole('student'), createShare);
router.delete('/share', requireRole('student'), revokeShare);
router.get('/readiness/whatif/:roadmapId', requireRole('student'), getWhatIfHandler);
router.get('/readiness/history', requireRole('student'), getHistoryHandler);
router.get('/checklist', requireRole('student'), getChecklistHandler);
router.patch('/checklist/:key', requireRole('student'), placementWriteLimiter, toggleChecklistHandler);
router.post('/mock/:studentId', requireRole('mentor', 'admin'), placementWriteLimiter, addMockHandler);

export default router;
