import { addDays, istDayKey, startOfISTDay } from './dateHelpers.js';

export const computeProgress = (roadmap) => {
    const days = roadmap.days || [];
    const completedDays = days.filter((day) => day.completed).length;
    const totalDays = days.length;
    const today = startOfISTDay();
    const todayKey = istDayKey(today);
    const completedDayKeys = new Set(
        days
            .filter((day) => day.completed && day.completedAt)
            .map((day) => istDayKey(new Date(day.completedAt)))
    );

    let cursor = today;
    if (!completedDayKeys.has(todayKey)) cursor = addDays(cursor, -1);

    let currentStreak = 0;
    while (completedDayKeys.has(istDayKey(cursor))) {
        currentStreak += 1;
        cursor = addDays(cursor, -1);
    }

    const todayDay = days.find((day) => istDayKey(new Date(day.date)) === todayKey);

    return {
        completedDays,
        totalDays,
        completionPercent: totalDays === 0 ? 0 : Math.round((completedDays / totalDays) * 100),
        currentStreak,
        todayDayNumber: todayDay?.dayNumber ?? null,
    };
};

export const serializeRoadmap = (roadmap, { includeDays }) => {
    const serialized = typeof roadmap.toObject === 'function'
        ? roadmap.toObject()
        : { ...roadmap };
    serialized.progress = computeProgress(serialized);
    if (!includeDays) delete serialized.days;
    return serialized;
};
