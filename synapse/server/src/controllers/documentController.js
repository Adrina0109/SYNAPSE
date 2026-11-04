import mongoose from 'mongoose';
import Chunk from '../models/Chunk.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { ingestDocument } from '../services/ragService.js';
import { createDocumentSchema, documentIdParamsSchema } from '../validators/documentValidators.js';

const validationErrors = (issues) => {
    const errors = {};
    issues.forEach((issue) => {
        const field = issue.code === 'unrecognized_keys'
            ? [issue.path.join('.'), issue.keys.join(', ')].filter(Boolean).join('.')
            : issue.path.join('.') || 'general';
        errors[field] = issue.message;
    });
    return errors;
};

const respondWithValidationErrors = (res, issues) => res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: validationErrors(issues),
});

export const createDocument = async (req, res, next) => {
    try {
        const parsed = createDocumentSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'A file is required.' });
        }

        const document = await ingestDocument({
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            title: parsed.data.title,
            category: parsed.data.category,
            accessLevel: parsed.data.accessLevel,
            fileName: req.file.originalname,
            userId: req.user.id,
        });

        res.status(201).json({
            success: true,
            message: 'Document uploaded and indexed successfully.',
            document: {
                id: document._id,
                title: document.title,
                category: document.category,
                accessLevel: document.accessLevel,
                fileName: document.fileName,
                pageCount: document.pageCount,
                chunkCount: document.chunkCount,
                createdAt: document.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getDocuments = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('role');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
        }

        const filter = user.role === 'student' ? { accessLevel: 'all' } : {};
        const documents = await Document.find(filter)
            .sort({ createdAt: -1 })
            .select('title category accessLevel pageCount chunkCount uploadedBy createdAt')
            .populate({ path: 'uploadedBy', select: 'name' })
            .lean();

        res.status(200).json({
            success: true,
            message: 'Documents retrieved successfully.',
            documents: documents.map((document) => ({
                id: document._id,
                title: document.title,
                category: document.category,
                accessLevel: document.accessLevel,
                pageCount: document.pageCount,
                chunkCount: document.chunkCount,
                uploaderName: document.uploadedBy?.name || 'Unknown',
                createdAt: document.createdAt,
            })),
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDocument = async (req, res, next) => {
    try {
        const parsedId = documentIdParamsSchema.safeParse(req.params);
        if (!parsedId.success) return respondWithValidationErrors(res, parsedId.error.errors);

        const documentId = new mongoose.Types.ObjectId(parsedId.data.id);
        const document = await Document.findById(documentId).select('_id');
        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found.' });
        }

        await Chunk.deleteMany({ document: documentId });
        await Document.deleteOne({ _id: documentId });

        res.status(200).json({
            success: true,
            message: 'Document and its chunks deleted successfully.',
        });
    } catch (err) {
        next(err);
    }
};
