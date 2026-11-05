import mongoose from 'mongoose';
import Roadmap from '../models/Roadmap.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import {
    addDaysToKey,
    dayKeyToDate,
    istDayKey,
} from '../utils/dateHelpers.js';
import {
    computeCapacity,
    conflictsInvolving,
    detectConflictsCore,
    planReplanCore,
} from '../utils/plannerCore.js';

const loadPlannerData = async (userId) => {
    const [user, tasks, roadmaps] = await Promise.all([
        User.findOne({ _id: userId }).select('dailyHours weeklyClassHours').lean(),
        Task.find({ user: userId, status: { $ne: 'completed' } }).lean(),
        Roadmap.find({ user: userId, status: 'active' }).lean(),
    ]);

    return { user, tasks, roadmaps };
};

const toDate = (date) => (
    date instanceof Date ? date : new Date(date)
);

export const getDailyCapacity = async (userId, fromDate, toDateValue) => {
    const start = fromDate === undefined ? new Date() : toDate(fromDate);
    const startKey = istDayKey(start);
    const endKey = toDateValue === undefined
        ? addDaysToKey(startKey, 13)
        : istDayKey(toDate(toDateValue));
    const days = Math.min(60, Math.max(1, Math.floor(
        (new Date(`${endKey}T00:00:00+05:30`).getTime()
            - new Date(`${startKey}T00:00:00+05:30`).getTime()) / 86400000
    ) + 1));
    const { user, tasks, roadmaps } = await loadPlannerData(userId);
    const capacity = computeCapacity({
        user: user ?? {},
        tasks,
        roadmaps,
        today: start,
        days,
    });
    return capacity.days;
};

export const detectConflicts = async (userId) => {
    const { user, tasks, roadmaps } = await loadPlannerData(userId);
    return detectConflictsCore({ user: user ?? {}, tasks, roadmaps });
};

export const getConflictsForTasks = async (userId, taskIds) => {
    try {
        return conflictsInvolving(await detectConflicts(userId), taskIds);
    } catch (error) {
        const status = error?.statusCode ?? error?.code ?? 'unknown';
        const message = String(error?.message ?? 'Unknown error')
            .replace(/[\r\n\t]+/g, ' ')
            .slice(0, 300);
        console.error(`[Planner] Failed to load task conflicts (${status}): ${message}`);
        return [];
    }
};

export const previewReplan = async (userId) => {
    const { user, tasks, roadmaps } = await loadPlannerData(userId);
    return planReplanCore({ user: user ?? {}, tasks, roadmaps });
};

const createStalePlanError = () => {
    const error = new Error('Your plan changed since the preview. Please preview again.');
    error.statusCode = 409;
    return error;
};

export const applyReplan = async (userId, fingerprint) => {
    const plan = await previewReplan(userId);
    if (plan.fingerprint !== fingerprint) throw createStalePlanError();
    if (!plan.hasChanges) {
        return {
            applied: false,
            tasksUpdated: 0,
            roadmapDaysUpdated: 0,
        };
    }

    const session = await mongoose.startSession();
    let tasksUpdated = 0;
    let roadmapDaysUpdated = 0;
    try {
        await session.withTransaction(async () => {
            tasksUpdated = 0;
            roadmapDaysUpdated = 0;
            for (const { taskId, plan: workPlan } of plan.newTaskPlans) {
                const result = await Task.updateOne(
                    { _id: taskId, user: userId, status: { $ne: 'completed' } },
                    {
                        $set: {
                            workPlan: workPlan.map(({ date, hours }) => ({
                                date: dayKeyToDate(date),
                                hours,
                            })),
                        },
                    },
                    { session }
                );
                if (result.matchedCount !== 1) throw createStalePlanError();
                tasksUpdated += 1;
            }

            const updatesByRoadmap = new Map();
            plan.roadmapDateUpdates.forEach((update) => {
                if (!updatesByRoadmap.has(update.roadmapId)) {
                    updatesByRoadmap.set(update.roadmapId, []);
                }
                updatesByRoadmap.get(update.roadmapId).push(update);
            });

            for (const [roadmapId, updates] of updatesByRoadmap) {
                const roadmap = await Roadmap.findOne({
                    _id: roadmapId,
                    user: userId,
                    status: 'active',
                }).session(session);
                if (!roadmap) throw createStalePlanError();

                updates.forEach(({ dayNumber, date }) => {
                    const day = roadmap.days.find((entry) => entry.dayNumber === dayNumber);
                    if (!day || day.completed) throw createStalePlanError();
                    day.date = dayKeyToDate(date);
                });
                await roadmap.save({ session });
                roadmapDaysUpdated += updates.length;
            }
        });
    } finally {
        await session.endSession();
    }

    return { applied: true, tasksUpdated, roadmapDaysUpdated };
};
