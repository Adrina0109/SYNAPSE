import Task from '../models/Task.js';
import User from '../models/User.js';
import Roadmap from '../models/Roadmap.js';
import {
    getAssignedStudentIds,
    getAssignedStudents,
    resolveRecipientStudentIds,
} from '../utils/mentorHelpers.js';
import { getReadiness } from '../services/readinessService.js';
import { computeRisk, summarizeStudent } from '../services/riskService.js';
import { invalidateDigest } from '../services/digestService.js';
import { getTaskStats, getTaskStatsByUser } from '../services/taskStatsService.js';
import {
    mentorBroadcastSchema,
    studentIdParamsSchema,
} from '../validators/mentorValidators.js';

const studentFields = 'name email department year skills careerGoal dailyHours onboardingComplete';

const validationErrors = (issues) => {
    const errors = {};
    issues.forEach((issue) => {
        const field = issue.path[0]
            ?? (issue.code === 'unrecognized_keys' ? issue.keys.join(', ') : 'general');
        errors[field] = issue.message;
    });
    return errors;
};

const respondWithValidationErrors = (res, issues) => res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: validationErrors(issues),
});

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
        const taskStatsByStudent = await getTaskStatsByUser(studentIds, now);

        const result = await Promise.all(students.map(async (student) => {
            const taskStats = taskStatsByStudent.get(String(student._id));
            const [risk, readiness] = await Promise.all([
                computeRisk(student._id, now),
                getReadiness(student._id, now),
            ]);
            return {
                ...student,
                pendingTaskCount: taskStats?.pending ?? 0,
                overdueTaskCount: taskStats?.overdue ?? 0,
                completedTaskCount: taskStats?.completed ?? 0,
                completionRate: taskStats?.completionRate ?? 0,
                risk,
                readiness,
            };

        }));

        res.status(200).json({
            success: true,
            message: 'Students retrieved successfully',
            students: result,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/mentor/recipients
export const getRecipients = async (req, res, next) => {
    try {
        const students = await getAssignedStudents(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Announcement recipients retrieved successfully',
            students,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/mentor/students/:id
export const getStudent = async (req, res, next) => {
    try {
        const parsed = studentIdParamsSchema.safeParse(req.params);
        if (!parsed.success) {
            return respondWithValidationErrors(res, parsed.error.errors);
        }

        const studentIds = await getAssignedStudentIds(req.user.id);
        if (!studentIds.some((id) => String(id) === parsed.data.id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This student is not assigned to you.',
            });
        }

        const student = await User.findOne({ _id: parsed.data.id, role: 'student' })
            .select(studentFields)
            .lean();
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const [tasks, roadmaps, readiness, risk] = await Promise.all([
            Task.find({ user: student._id }).sort({ createdAt: -1 }).limit(10).lean(),
            Roadmap.find({ user: student._id }).sort({ createdAt: -1 }).lean(),
            getReadiness(student._id),
            computeRisk(student._id),
        ]);

        res.status(200).json({
            success: true,
            message: 'Student retrieved successfully',
            student: { ...student, tasks, roadmaps, readiness, risk },
        });
    } catch (err) {
        next(err);
    }
};

export const getMentorAnalytics = async (req, res, next) => {
    try {
        const studentIds = await getAssignedStudentIds(req.user.id);
        const [taskStats, riskAndReadiness] = await Promise.all([
            getTaskStats(studentIds),
            Promise.all(studentIds.map(async (studentId) => {
                const [risk, readiness] = await Promise.all([
                    computeRisk(studentId),
                    getReadiness(studentId),
                ]);
                return { risk, readiness };
            })),
        ]);

        const riskDistribution = { low: 0, medium: 0, high: 0 };
        let readinessTotal = 0;
        riskAndReadiness.forEach(({ risk, readiness }) => {
            riskDistribution[risk.riskLevel] += 1;
            readinessTotal += readiness.score;
        });
        const analytics = {
            taskCompletionRate: taskStats.completionRate,
            taskStats,
            riskDistribution,
            averageReadiness: riskAndReadiness.length === 0
                ? 0
                : Math.round((readinessTotal / riskAndReadiness.length) * 10) / 10,
            studentCount: studentIds.length,
        };
        res.status(200).json({
            success: true,
            message: 'Mentor analytics retrieved successfully',
            analytics,
        });
    } catch (err) {
        next(err);
    }
};

export const getStudentSummary = async (req, res, next) => {
    try {
        const parsed = studentIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const studentIds = await getAssignedStudentIds(req.user.id);
        if (!studentIds.some((id) => String(id) === parsed.data.id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This student is not assigned to you.',
            });
        }

        const summary = await summarizeStudent(parsed.data.id);
        res.status(200).json({
            success: true,
            message: 'Student summary generated successfully',
            summary,
        });
    } catch (err) {
        next(err);
    }
};

export const broadcastTask = async (req, res, next) => {
    try {
        const parsed = mentorBroadcastSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const studentIds = await resolveRecipientStudentIds(
            req.user.id,
            req.userRole,
            parsed.data.recipientMode,
            parsed.data.studentIds
        );
        const taskData = { ...parsed.data };
        const recipientMode = taskData.recipientMode;
        delete taskData.recipientMode;
        delete taskData.studentIds;
        const tasks = await Task.insertMany(studentIds.map((studentId) => ({
            ...taskData,
            user: studentId,
            source: 'mentor',
        })));
        studentIds.forEach((studentId) => invalidateDigest(studentId));
        res.status(201).json({
            success: true,
            message: 'Task broadcast successfully',
            count: tasks.length,
            recipientMode,
            recipientCount: tasks.length,
        });
    } catch (err) {
        next(err);
    }
};
