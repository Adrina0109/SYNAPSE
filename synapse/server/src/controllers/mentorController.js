import mongoose from 'mongoose';
import { z } from 'zod';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { getAssignedStudentIds, isAssigned } from '../utils/mentorHelpers.js';

const studentFields = 'name email department year skills careerGoal dailyHours onboardingComplete';
const studentIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Student ID must be a valid ObjectId');

const isAdmin = (req) => req.userRole === 'admin';

const getStudentsForRequest = async (req) => {
    const studentIds = await getAssignedStudentIds(req.user.id);
    return User.find({
        _id: { $in: studentIds },
        role: 'student',
    })
        .select(studentFields)
        .sort({ name: 1 })
        .lean();
};

// GET /api/mentor/students
export const getStudents = async (req, res, next) => {
    try {
        const students = await getStudentsForRequest(req);
        const studentIds = students.map((student) => student._id);
        const now = new Date();
        const taskCounts = studentIds.length === 0
            ? []
            : await Task.aggregate([
                { $match: { user: { $in: studentIds } } },
                {
                    $group: {
                        _id: '$user',
                        pendingTaskCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
                        },
                        overdueTaskCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ne: ['$status', 'completed'] },
                                            { $ne: ['$deadline', null] },
                                            { $lt: ['$deadline', now] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]);
        const taskCountsByStudent = new Map(
            taskCounts.map((counts) => [String(counts._id), counts])
        );

        const result = students.map((student) => {
            const counts = taskCountsByStudent.get(String(student._id));
            return {
                ...student,
                pendingTaskCount: counts?.pendingTaskCount || 0,
                overdueTaskCount: counts?.overdueTaskCount || 0,
            };
        });

        res.status(200).json({
            success: true,
            message: 'Students retrieved successfully',
            students: result,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/mentor/students/:id
export const getStudent = async (req, res, next) => {
    try {
        const parsed = studentIdSchema.safeParse(req.params.id);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: { id: parsed.error.errors[0].message },
            });
        }

        const studentId = new mongoose.Types.ObjectId(parsed.data);
        const student = await User.findOne({ _id: studentId, role: 'student' })
            .select(studentFields)
            .lean();
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        if (!isAdmin(req) && !await isAssigned(req.user.id, studentId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This student is not assigned to you.',
            });
        }

        const tasks = await Task.find({ user: studentId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.status(200).json({
            success: true,
            message: 'Student retrieved successfully',
            student: { ...student, tasks },
        });
    } catch (err) {
        next(err);
    }
};
