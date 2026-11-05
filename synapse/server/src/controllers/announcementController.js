import mongoose from 'mongoose';
import Announcement from '../models/Announcement.js';
import AnnouncementReceipt from '../models/AnnouncementReceipt.js';
import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { getConflictsForTasks } from '../services/capacityService.js';
import { extractTasksFromText } from '../services/announcementService.js';
import { getAssignedStudentIds } from '../utils/mentorHelpers.js';
import {
    announcementIdParamsSchema,
    confirmAnnouncementSchema,
    createAnnouncementSchema,
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

const publicAnnouncement = (announcement) => ({
    _id: announcement._id,
    rawText: announcement.rawText,
    sourceType: announcement.sourceType,
    audience: announcement.audience,
    recipientCount: announcement.recipientCount,
    createdAt: announcement.createdAt,
});

const publicTask = (task) => ({
    _id: task._id,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    deadline: task.deadline,
    estimatedHours: task.estimatedHours,
    status: task.status,
    source: task.source,
    announcement: task.announcement,
    createdAt: task.createdAt,
});

export const createAnnouncement = async (req, res, next) => {
    let session;
    try {
        const parsed = createAnnouncementSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        let audience = parsed.data.audience;
        let targetMentorId = null;
        let studentIds;

        if (req.userRole === 'mentor') {
            audience = 'assigned';
            studentIds = await getAssignedStudentIds(req.user.id);
        } else if (audience === 'assigned') {
            if (!parsed.data.targetMentorId) {
                return res.status(400).json({
                    success: false,
                    message: 'A mentor is required when targeting assigned students.',
                });
            }
            const mentor = await User.findOne({
                _id: parsed.data.targetMentorId,
                role: 'mentor',
            }).select('_id').lean();
            if (!mentor) {
                return res.status(400).json({ success: false, message: 'Target mentor not found.' });
            }
            targetMentorId = mentor._id;
            studentIds = await getAssignedStudentIds(mentor._id);
        } else {
            audience = 'all';
            const students = await User.find({ role: 'student' }).select('_id').lean();
            studentIds = students.map(({ _id }) => _id);
        }

        session = await mongoose.startSession();
        let announcement;
        await session.withTransaction(async () => {
            [announcement] = await Announcement.create([{
                createdBy: req.user.id,
                rawText: parsed.data.rawText,
                sourceType: parsed.data.sourceType,
                audience,
                targetMentorId,
                recipientCount: studentIds.length,
            }], { session });

            if (studentIds.length) {
                const records = studentIds.map((userId) => ({
                    announcement: announcement._id,
                    user: userId,
                }));
                await AnnouncementReceipt.insertMany(records, { session });
                await Notification.insertMany(records, { session });
            }
        });

        res.status(201).json({
            success: true,
            message: 'Announcement sent successfully.',
            announcement: publicAnnouncement(announcement),
        });
    } catch (err) {
        next(err);
    } finally {
        if (session) await session.endSession();
    }
};

export const getSentAnnouncements = async (req, res, next) => {
    try {
        const filter = req.userRole === 'admin' ? {} : { createdBy: req.user.id };
        const announcements = await Announcement.find(filter)
            .sort({ createdAt: -1 })
            .select('_id rawText sourceType audience recipientCount createdAt')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Sent announcements retrieved successfully.',
            announcements,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteAnnouncement = async (req, res, next) => {
    let session;
    try {
        const parsedId = announcementIdParamsSchema.safeParse(req.params);
        if (!parsedId.success) return respondWithValidationErrors(res, parsedId.error.errors);

        const filter = { _id: parsedId.data.id };
        if (req.userRole === 'mentor') filter.createdBy = req.user.id;

        session = await mongoose.startSession();
        await session.withTransaction(async () => {
            const announcement = await Announcement.findOneAndDelete(filter, { session });
            if (!announcement) {
                throw createStatusError(404, 'Announcement not found.');
            }
            await AnnouncementReceipt.deleteMany({ announcement: announcement._id }, { session });
            await Notification.deleteMany({ announcement: announcement._id }, { session });
        });

        res.status(200).json({ success: true, message: 'Announcement deleted successfully.' });
    } catch (err) {
        next(err);
    } finally {
        if (session) await session.endSession();
    }
};

export const getAnnouncementInbox = async (req, res, next) => {
    try {
        const receipts = await AnnouncementReceipt.find({
            user: req.user.id,
            status: 'pending',
        })
            .sort({ createdAt: -1 })
            .populate({ path: 'announcement', select: 'rawText sourceType createdAt' })
            .lean();

        res.status(200).json({
            success: true,
            message: 'Announcement inbox retrieved successfully.',
            announcements: receipts
                .filter(({ announcement }) => announcement)
                .map((receipt) => ({
                    receiptId: receipt._id,
                    announcementId: receipt.announcement._id,
                    rawText: receipt.announcement.rawText,
                    sourceType: receipt.announcement.sourceType,
                    createdAt: receipt.announcement.createdAt,
                    receivedAt: receipt.createdAt,
                })),
        });
    } catch (err) {
        next(err);
    }
};

const findPendingReceipt = async (announcementId, userId) => {
    const receipt = await AnnouncementReceipt.findOne({
        announcement: announcementId,
        user: userId,
        status: 'pending',
    }).populate({ path: 'announcement', select: 'rawText sourceType' });
    return receipt?.announcement ? receipt : null;
};

export const extractAnnouncementTasks = async (req, res, next) => {
    try {
        const parsedId = announcementIdParamsSchema.safeParse(req.params);
        if (!parsedId.success) return respondWithValidationErrors(res, parsedId.error.errors);

        const receipt = await findPendingReceipt(parsedId.data.id, req.user.id);
        if (!receipt) return res.status(404).json({ success: false, message: 'Announcement not found.' });

        const tasks = await extractTasksFromText(receipt.announcement.rawText, receipt.announcement.sourceType);
        await Notification.updateOne(
            { announcement: parsedId.data.id, user: req.user.id },
            { $set: { readAt: new Date() } }
        );

        res.status(200).json({
            success: true,
            message: 'Tasks extracted. Review them before confirming.',
            tasks,
        });
    } catch (err) {
        next(err);
    }
};

export const confirmAnnouncementTasks = async (req, res, next) => {
    let session;
    try {
        const parsedId = announcementIdParamsSchema.safeParse(req.params);
        if (!parsedId.success) return respondWithValidationErrors(res, parsedId.error.errors);

        const parsedBody = confirmAnnouncementSchema.safeParse(req.body);
        if (!parsedBody.success) return respondWithValidationErrors(res, parsedBody.error.errors, true);

        session = await mongoose.startSession();
        let createdTasks = [];
        await session.withTransaction(async () => {
            const receipt = await AnnouncementReceipt.findOneAndUpdate(
                {
                    announcement: parsedId.data.id,
                    user: req.user.id,
                    status: 'pending',
                },
                { $set: { status: 'confirmed', confirmedAt: new Date() } },
                { new: true, session }
            );
            if (!receipt) {
                const existingReceipt = await AnnouncementReceipt.findOne({
                    announcement: parsedId.data.id,
                    user: req.user.id,
                }).session(session);
                throw createStatusError(
                    existingReceipt ? 409 : 404,
                    existingReceipt ? 'Announcement has already been handled.' : 'Announcement not found.'
                );
            }

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
                        announcement: parsedId.data.id,
                    })),
                    { session }
                );
            await Notification.updateOne(
                { announcement: parsedId.data.id, user: req.user.id },
                { $set: { readAt: new Date() } },
                { session }
            );
        });

        const conflicts = createdTasks.length === 0
            ? []
            : await getConflictsForTasks(req.user.id, createdTasks.map((task) => task._id));
        res.status(200).json({
            success: true,
            message: 'Announcement confirmed and tasks added successfully.',
            tasks: createdTasks.map(publicTask),
            conflicts,
        });
    } catch (err) {
        next(err);
    } finally {
        if (session) await session.endSession();
    }
};

export const dismissAnnouncement = async (req, res, next) => {
    let session;
    try {
        const parsedId = announcementIdParamsSchema.safeParse(req.params);
        if (!parsedId.success) return respondWithValidationErrors(res, parsedId.error.errors);

        session = await mongoose.startSession();
        await session.withTransaction(async () => {
            const receipt = await AnnouncementReceipt.findOneAndUpdate(
                {
                    announcement: parsedId.data.id,
                    user: req.user.id,
                    status: 'pending',
                },
                { $set: { status: 'dismissed' } },
                { new: true, session }
            );
            if (!receipt) {
                const existingReceipt = await AnnouncementReceipt.findOne({
                    announcement: parsedId.data.id,
                    user: req.user.id,
                }).session(session);
                throw createStatusError(
                    existingReceipt ? 409 : 404,
                    existingReceipt ? 'Announcement has already been handled.' : 'Announcement not found.'
                );
            }
            await Notification.updateOne(
                { announcement: parsedId.data.id, user: req.user.id },
                { $set: { dismissedAt: new Date() } },
                { session }
            );
        });

        res.status(200).json({ success: true, message: 'Announcement dismissed.' });
    } catch (err) {
        next(err);
    } finally {
        if (session) await session.endSession();
    }
};
