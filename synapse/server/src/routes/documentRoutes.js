import express from 'express';
import multer from 'multer';
import { createDocument, deleteDocument, getDocuments } from '../controllers/documentController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowedTypes = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
        };
        const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
        if (allowedTypes[extension] !== file.mimetype) {
            const error = new Error('Only PDF and plain text files are allowed.');
            error.statusCode = 400;
            return callback(error);
        }
        callback(null, true);
    },
});

const handleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            err.statusCode = 400;
            if (err.code === 'LIMIT_FILE_SIZE') err.message = 'File must be 10 MB or smaller.';
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                err.message = 'Upload a single file using the "file" field.';
            }
        }
        next(err);
    });
};

router.use(requireAuth);

router.post('/', requireRole('admin', 'mentor'), handleUpload, createDocument);
router.get('/', requireRole('student', 'mentor', 'admin'), getDocuments);
router.delete('/:id', requireRole('admin', 'mentor'), deleteDocument);

export default router;
