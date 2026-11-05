import mongoose from 'mongoose';
import { z } from 'zod';
import PlacementDrive from '../models/PlacementDrive.js';
import User from '../models/User.js';
import { checkDriveEligibility } from '../services/driveEligibility.js';
import { startOfISTDay } from '../utils/dateHelpers.js';

const driveFieldsSchema = z.object({
    company: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(120),
    date: z.coerce.date(),
    minCgpa: z.number().min(0).max(10).default(0),
    maxBacklogs: z.number().int().min(0).max(20).nullable().optional(),
    branches: z.array(z.string().trim().max(40)).max(10).default([]),
    status: z.enum(['open', 'closed']).default('open'),
}).strict();

const createDriveSchema = driveFieldsSchema;
const updateDriveSchema = driveFieldsSchema.partial();
const driveIdParamsSchema = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'ID must be a valid ObjectId'),
}).strict();

const validationErrors = (issues) => {
    const errors = {};
    issues.forEach((issue) => {
        const field = issue.path[0] ?? (issue.code === 'unrecognized_keys' ? issue.keys.join(', ') : 'general');
        errors[field] = issue.message;
    });
    return errors;
};

const respondWithValidationErrors = (res, issues) => res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: validationErrors(issues),
});

export const listDrives = async (req, res, next) => {
    try {
        if (req.userRole === 'student') {
            const student = await User.findById(req.user.id)
                .select('cgpa backlogs department')
                .lean();
            if (!student) {
                return res.status(404).json({ success: false, message: 'Student not found.' });
            }

            const drives = await PlacementDrive.find({
                $or: [
                    { status: 'open' },
                    { date: { $gte: startOfISTDay() } },
                ],
            }).sort({ date: 1 }).lean();
            const now = new Date();

            res.status(200).json({
                success: true,
                message: 'Placement drives retrieved successfully',
                drives: drives.map((drive) => ({
                    ...drive,
                    eligibility: checkDriveEligibility(drive, student, now),
                })),
            });
            return;
        }

        const drives = await PlacementDrive.find()
            .populate('createdBy', 'name')
            .sort({ date: 1 });
        res.status(200).json({
            success: true,
            message: 'Placement drives retrieved successfully',
            drives,
        });
    } catch (err) {
        next(err);
    }
};

export const createDrive = async (req, res, next) => {
    try {
        const parsed = createDriveSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const drive = await PlacementDrive.create({
            ...parsed.data,
            createdBy: req.user.id,
        });
        res.status(201).json({
            success: true,
            message: 'Placement drive created successfully',
            drive,
        });
    } catch (err) {
        next(err);
    }
};

const parseDriveId = (id, res) => {
    const parsed = driveIdParamsSchema.safeParse({ id });
    if (parsed.success) return parsed.data.id;
    respondWithValidationErrors(res, parsed.error.errors);
    return null;
};

export const updateDrive = async (req, res, next) => {
    try {
        const id = parseDriveId(req.params.id, res);
        if (!id) return;

        const parsed = updateDriveSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const filter = { _id: new mongoose.Types.ObjectId(id) };
        if (req.userRole !== 'admin') filter.createdBy = req.user.id;

        const drive = await PlacementDrive.findOneAndUpdate(
            filter,
            { $set: parsed.data },
            { new: true, runValidators: true }
        );
        if (!drive) {
            return res.status(404).json({ success: false, message: 'Drive not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Placement drive updated successfully',
            drive,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDrive = async (req, res, next) => {
    try {
        const id = parseDriveId(req.params.id, res);
        if (!id) return;

        const filter = { _id: new mongoose.Types.ObjectId(id) };
        if (req.userRole !== 'admin') filter.createdBy = req.user.id;

        const drive = await PlacementDrive.findOneAndDelete(filter);
        if (!drive) {
            return res.status(404).json({ success: false, message: 'Drive not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Placement drive deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};
