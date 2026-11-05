import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { addDaysToKey, dayKeyToDate, istDayKey } from '../utils/dateHelpers.js';

const emptyStats = () => ({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    dueInThreeDays: 0,
    completedThisWeek: 0,
    completionRate: 0,
});

export const getTaskStatsByUser = async (userIds, now = new Date()) => {
    const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(String))];
    if (ids.length === 0) return new Map();

    const todayKey = istDayKey(now);
    const [year, month, day] = todayKey.split('-').map(Number);
    const utcWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const weekStartKey = addDaysToKey(todayKey, -((utcWeekday + 6) % 7));
    const weekEndKey = addDaysToKey(weekStartKey, 7);
    const weekStart = dayKeyToDate(weekStartKey);
    const weekEnd = dayKeyToDate(weekEndKey);
    const dueSoonLimit = new Date(now.getTime() + 3 * 86400000);
    const rows = await Task.aggregate([
        { $match: { user: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } } },
        {
            $group: {
                _id: '$user',
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] } },
                overdue: {
                    $sum: {
                        $cond: [{
                            $and: [
                                { $ne: ['$status', 'completed'] },
                                { $ne: ['$deadline', null] },
                                { $lt: ['$deadline', now] },
                            ],
                        }, 1, 0],
                    },
                },
                dueInThreeDays: {
                    $sum: {
                        $cond: [{
                            $and: [
                                { $ne: ['$status', 'completed'] },
                                { $ne: ['$deadline', null] },
                                { $gte: ['$deadline', now] },
                                { $lte: ['$deadline', dueSoonLimit] },
                            ],
                        }, 1, 0],
                    },
                },
                completedThisWeek: {
                    $sum: {
                        $cond: [{
                            $and: [
                                { $eq: ['$status', 'completed'] },
                                { $gte: ['$completedAt', weekStart] },
                                { $lt: ['$completedAt', weekEnd] },
                            ],
                        }, 1, 0],
                    },
                },
            },
        },
    ]);

    const statsByUser = new Map(ids.map((id) => [id, emptyStats()]));
    rows.forEach((row) => {
        const stats = { ...row };
        delete stats._id;
        stats.completionRate = stats.total === 0
            ? 0
            : Math.round((stats.completed / stats.total) * 10000) / 100;
        statsByUser.set(String(row._id), stats);
    });
    return statsByUser;
};

export const getTaskStats = async (userIds, now = new Date()) => {
    const statsByUser = await getTaskStatsByUser(userIds, now);
    const totals = [...statsByUser.values()].reduce((result, stats) => {
        result.total += stats.total;
        result.completed += stats.completed;
        result.pending += stats.pending;
        result.overdue += stats.overdue;
        result.dueInThreeDays += stats.dueInThreeDays;
        result.completedThisWeek += stats.completedThisWeek;
        return result;
    }, emptyStats());
    totals.completionRate = totals.total === 0
        ? 0
        : Math.round((totals.completed / totals.total) * 10000) / 100;
    return totals;
};
