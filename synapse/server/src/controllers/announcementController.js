import mongoose from 'mongoose';
import Announcement from '../models/Announcement.js';
import Task from '../models/Task.js';
import { extractTasksFromText } from '../services/announcementService.js';
import {
    announcementIdParamsSchema,
    confirmAnnouncementSchema,
    extractAnnouncementSchema,
} from '../validators/announcementValidators.js';

const validationErrors = (issues, useFullPath = false) => {
    const errors = {};
    issues.forEach((issue) => {
        const path = useFullPath ? issue.path.join('.') : issue.path[0];
        const field = issue.code === 'unrecognized_keys'
            ? [path, issue.keys.join(', ')].filter(Boolean).join('.')
            : path || 'general';
        errors[field] = issue.message;
    });
    return errors;
};

const respondWithValidationErrors = (res, issues, useFullPath = false) => res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: validationErrors(issues, useFullPath),
});

const createStatusError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

// POST /api/announcements/extract
export const extractAnnouncement = async (req, res, next) => {
    try {
        const parsed = extractAnnouncementSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const extracted = await extractTasksFromText(parsed.data.rawText, parsed.data.sourceType);
        const announcement = await Announcement.create({
            createdBy: req.user.id,
            rawText: parsed.data.rawText,
            sourceType: parsed.data.sourceType,
            extracted,
        });

        res.status(201).json({
            success: true,
            message: 'Announcement tasks extracted. Review and confirm before adding them to your tasks.',
            announcement,
            tasks: announcement.extracted,
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/announcements/:id/confirm
export const confirmAnnouncement = async (req, res, next) => {
    let session;
    try {
        const parsedId = announcementIdParamsSchema.safeParse(req.params);
        if (!parsedId.success) return respondWithValidationErrors(res, parsedId.error.errors);

        const parsedBody = confirmAnnouncementSchema.safeParse(req.body);
        if (!parsedBody.success) return respondWithValidationErrors(res, parsedBody.error.errors, true);

        const announcementId = new mongoose.Types.ObjectId(parsedId.data.id);
        const announcement = await Announcement.findOne({
            _id: announcementId,
            createdBy: req.user.id,
        });
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found.' });
        }
        if (announcement.status === 'confirmed') {
            return res.status(409).json({ success: false, message: 'Announcement has already been confirmed.' });
        }

        session = await mongoose.startSession();
        let createdTasks = [];
        await session.withTransaction(async () => {
            createdTasks = parsedBody.data.tasks.length === 0
                ? []
                : await Task.insertMany(
                    parsedBody.data.tasks.map((task) => ({
                        user: req.user.id,
                        title: task.title,
                        description: task.description,
                        category: task.category,
                        priority: task.priority,
                        deadline: task.deadline,
                        estimatedHours: task.estimatedHours,
                        status: 'pending',
                        source: 'announcement',
                        announcement: announcementId,
                    })),
                    { session }
                );

            const result = await Announcement.updateOne(
                { _id: announcementId, createdBy: req.user.id, status: 'draft' },
                { $set: { status: 'confirmed' } },
                { session }
            );
            if (result.modifiedCount !== 1) {
                throw createStatusError(409, 'Announcement has already been confirmed.');
            }
        });

        res.status(200).json({
            success: true,
            message: 'Announcement confirmed and tasks added successfully',
            announcement: {
                ...announcement.toObject(),
                status: 'confirmed',
            },
            tasks: createdTasks,
        });
    } catch (err) {
        next(err);
    } finally {
        if (session) await session.endSession();
    }
};

// GET /api/announcements
export const getAnnouncements = async (req, res, next) => {
    try {
        const announcements = await Announcement.find({ createdBy: req.user.id })
            .sort({ createdAt: -1 })
            .select('rawText sourceType extracted status createdAt updatedAt')
            .lean();

        const result = announcements.map((announcement) => ({
            ...announcement,
            rawText: announcement.rawText.slice(0, 200),
        }));

        res.status(200).json({
            success: true,
            message: 'Announcements retrieved successfully',
            announcements: result,
        });
    } catch (err) {
        next(err);
    }
};
