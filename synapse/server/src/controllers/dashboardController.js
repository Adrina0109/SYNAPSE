import Roadmap from '../models/Roadmap.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { getReadiness } from '../services/readinessService.js';
import { buildDigest } from '../services/digestService.js';
import { detectConflicts } from '../services/capacityService.js';
import { addDaysToKey, dayKeyToDate, istDayKey } from '../utils/dateHelpers.js';
import { computeProgress } from '../utils/roadmapHelpers.js';
import { getTaskStats } from '../services/taskStatsService.js';

const loadRoadmapProgress = async (userId) => {
    const roadmaps = await Roadmap.find({ user: userId, status: 'active' })
        .select('goal status days')
        .lean();
    const activeRoadmaps = roadmaps.map((roadmap) => {
        const progress = computeProgress(roadmap);
        return {
            _id: roadmap._id,
            goal: roadmap.goal,
            status: roadmap.status,
            progress,
        };
    });
    return {
        activeRoadmaps,
        streak: activeRoadmaps.reduce(
            (longest, roadmap) => Math.max(longest, roadmap.progress.currentStreak),
            0
        ),
    };
};

const loadMentors = async (userId) => {
    const user = await User.findById(userId).select('mentors')
        .populate('mentors', 'name')
        .lean();
    return (user?.mentors ?? [])
        .filter(Boolean)
        .map(({ _id, name }) => ({ _id, name }));
};

const tryPart = async (name, task) => {
    try {
        return await task();
    } catch (error) {
        const status = error?.statusCode ?? error?.code ?? 'unknown';
        const message = String(error?.message ?? 'Unknown error')
            .replace(/[\r\n\t]+/g, ' ')
            .slice(0, 200);
        console.error(`[Dashboard] Failed to load ${name} (${status}): ${message}`);
        return null;
    }
};

export const getStudentDashboard = async (req, res, next) => {
    try {
        const now = new Date();
        const todayKey = istDayKey(now);
        const todayStart = dayKeyToDate(todayKey);
        const tomorrowStart = dayKeyToDate(addDaysToKey(todayKey, 1));

        const [
            todayTasks,
            nextDeadlines,
            roadmapData,
            taskStats,
            readiness,
            conflicts,
            digest,
            mentors,
        ] = await Promise.all([
            tryPart('today tasks', () => Task.find({
                user: req.user.id,
                status: { $ne: 'completed' },
                deadline: { $gte: todayStart, $lt: tomorrowStart },
            }).sort({ deadline: 1 }).lean()),
            tryPart('upcoming deadlines', () => Task.find({
                user: req.user.id,
                status: { $ne: 'completed' },
                deadline: { $gte: now },
            }).sort({ deadline: 1 }).limit(5).lean()),
            tryPart('roadmap progress', () => loadRoadmapProgress(req.user.id)),
            getTaskStats(req.user.id, now),
            tryPart('readiness', () => getReadiness(req.user.id, now)),
            tryPart('planner conflicts', () => detectConflicts(req.user.id)),
            tryPart('daily digest', () => buildDigest(req.user.id, now)),
            tryPart('mentors', () => loadMentors(req.user.id)),
        ]);

        res.status(200).json({
            success: true,
            message: 'Student dashboard retrieved successfully',
            todayTasks,
            nextDeadlines,
            overdueCount: taskStats.overdue,
            taskStats,
            activeRoadmaps: roadmapData?.activeRoadmaps ?? null,
            streak: roadmapData?.streak ?? null,
            readiness,
            readinessScore: readiness?.score ?? null,
            conflicts,
            digest,
            mentors,
        });
    } catch (err) {
        next(err);
    }
};
