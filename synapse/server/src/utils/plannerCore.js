/*
 * R1: Days are IST calendar days identified by YYYY-MM-DD. Hours are rounded
 * to two decimals and compared with EPS.
 * R2: Capacity is user.dailyHours when positive, otherwise the two-hour default;
 * weekly class hours do not affect capacity and weekends are normal days.
 * R3: Count tasks that are not completed, have a deadline, and need positive hours.
 * R4: Spread task hours over up to three days ending on the deadline, using days
 * on or after today. Round quarter-hour pieces and put the remainder on the last
 * day; overdue and due-today tasks are scheduled entirely today.
 * R5: Use a non-empty stored workPlan only when its sum matches estimatedHours
 * within 0.05 hours. Move past entries to today, entries past deadline to the
 * deadline (or today when overdue), and merge entries on the same day.
 * R6: Count incomplete days in active roadmaps on their dates, capped by daily
 * capacity. Earlier incomplete days are behind and do not add to the load.
 * R7: Load is task plus roadmap hours. Ratios below .4 are light, below .85
 * normal, up to 1 heavy, and above 1 overloaded. Free and shortfall hours are
 * clamped to zero.
 */
import {
    addDaysToKey,
    diffDays,
    formatDayKey,
    istDayKey,
} from './dateHelpers.js';

export const DEFAULT_DAILY_HOURS = 2;
export const SPREAD_DAYS = 3;
export const EPS = 0.001;
export const HORIZON_DAYS = 30;

const r2 = (hours) => Math.round((hours + Number.EPSILON) * 100) / 100;
const roundQuarterHour = (hours) => Math.round((hours + Number.EPSILON) * 4) / 4;
const toHours = (hours) => (Number.isFinite(Number(hours)) ? Math.max(0, Number(hours)) : 0);

const toDayKey = (date) => {
    if (date === null || date === undefined || date === '') return null;
    const parsedDate = date instanceof Date ? date : new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? null : istDayKey(parsedDate);
};

const isCountedTask = (task) => (
    task.status !== 'completed'
    && task.deadline !== null
    && task.deadline !== undefined
    && toHours(task.estimatedHours) > 0
    && toDayKey(task.deadline) !== null
);

const getTaskId = (task) => String(task._id ?? task.id ?? '');
const getRoadmapId = (roadmap) => String(roadmap._id ?? roadmap.id ?? '');

export const effectiveDailyHours = (user) => {
    const dailyHours = Number(user?.dailyHours);
    return r2(dailyHours > 0 ? dailyHours : DEFAULT_DAILY_HOURS);
};

export const roadmapDayHours = (day, availableHours) => {
    if (day.completed) return 0;
    return r2(Math.min(toHours(day.estimatedHours), Math.max(0, Number(availableHours) || 0)));
};

export const getTaskPlan = (task, today = new Date()) => {
    if (!isCountedTask(task)) return [];

    const todayKey = istDayKey(today);
    const deadlineKey = toDayKey(task.deadline);
    const estimatedHours = r2(toHours(task.estimatedHours));
    const workPlan = Array.isArray(task.workPlan) ? task.workPlan : [];

    if (workPlan.length > 0) {
        const validEntries = workPlan.map((entry) => ({
            date: toDayKey(entry.date),
            hours: Number(entry.hours),
        }));
        const hasInvalidEntry = validEntries.some(({ date, hours }) => (
            date === null || !Number.isFinite(hours) || hours < 0
        ));
        const storedHours = validEntries.reduce((sum, entry) => sum + entry.hours, 0);
        if (!hasInvalidEntry && Math.abs(storedHours - estimatedHours) <= 0.05) {
            const overdue = deadlineKey < todayKey;
            const normalized = new Map();
            validEntries.forEach(({ date, hours }) => {
                let normalizedDate = date < todayKey ? todayKey : date;
                if (normalizedDate > deadlineKey) {
                    normalizedDate = overdue ? todayKey : deadlineKey;
                }
                normalized.set(normalizedDate, (normalized.get(normalizedDate) ?? 0) + hours);
            });
            return [...normalized.entries()]
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, hours]) => ({ date, hours: r2(hours) }));
        }
    }

    if (deadlineKey <= todayKey) {
        return [{ date: todayKey, hours: estimatedHours }];
    }

    const spreadDates = Array.from({ length: SPREAD_DAYS }, (_, index) => (
        addDaysToKey(deadlineKey, index - (SPREAD_DAYS - 1))
    )).filter((date) => date >= todayKey);
    if (spreadDates.length === 0) {
        return [{ date: todayKey, hours: estimatedHours }];
    }

    const pieceHours = roundQuarterHour(estimatedHours / spreadDates.length);
    let remainingHours = estimatedHours;
    return spreadDates.map((date, index) => {
        const hours = index === spreadDates.length - 1
            ? r2(remainingHours)
            : r2(pieceHours);
        remainingHours = r2(remainingHours - hours);
        return { date, hours };
    });
};

const createCapacityDay = (date, availableHours) => ({
    date,
    availableHours,
    taskHours: 0,
    roadmapHours: 0,
    totalHours: 0,
    freeHours: availableHours,
    shortfallHours: 0,
    load: 'light',
    tasks: [],
    roadmapDays: [],
});

const setCapacityLoad = (day) => {
    day.taskHours = r2(day.taskHours);
    day.roadmapHours = r2(day.roadmapHours);
    day.totalHours = r2(day.taskHours + day.roadmapHours);
    day.freeHours = r2(Math.max(0, day.availableHours - day.totalHours));
    day.shortfallHours = r2(Math.max(0, day.totalHours - day.availableHours));
    const ratio = day.totalHours / day.availableHours;
    if (ratio < 0.4) day.load = 'light';
    else if (ratio < 0.85) day.load = 'normal';
    else if (ratio <= 1) day.load = 'heavy';
    else day.load = 'overloaded';
};

export const computeCapacity = ({
    user,
    tasks = [],
    roadmaps = [],
    today = new Date(),
    days = 14,
}) => {
    const todayKey = istDayKey(today);
    const availableHours = r2(effectiveDailyHours(user));
    const horizon = Math.max(0, Math.floor(Number(days) || 0));
    const capacityDays = Array.from({ length: horizon }, (_, index) => {
        const date = addDaysToKey(todayKey, index);
        return createCapacityDay(date, availableHours);
    });
    const capacityByDate = new Map(capacityDays.map((day) => [day.date, day]));
    const overdueTaskIds = new Set();

    (tasks ?? []).forEach((task) => {
        if (!isCountedTask(task)) return;
        const taskId = getTaskId(task);
        const deadlineKey = toDayKey(task.deadline);
        if (deadlineKey < todayKey) overdueTaskIds.add(taskId);

        getTaskPlan(task, today).forEach(({ date, hours }) => {
            const day = capacityByDate.get(date);
            if (!day || hours <= 0) return;
            day.taskHours += hours;
            const existing = day.tasks.find((entry) => entry.taskId === taskId);
            if (existing) existing.hours = r2(existing.hours + hours);
            else day.tasks.push({ taskId, title: task.title ?? '', hours: r2(hours) });
        });
    });

    let behindRoadmapDays = 0;
    (roadmaps ?? []).forEach((roadmap) => {
        if (roadmap.status !== 'active') return;
        (roadmap.days ?? []).forEach((day) => {
            if (day.completed) return;
            const date = toDayKey(day.date);
            if (!date) return;
            if (date < todayKey) {
                behindRoadmapDays += 1;
                return;
            }
            const capacityDay = capacityByDate.get(date);
            if (!capacityDay) return;
            const hours = roadmapDayHours(day, availableHours);
            if (hours <= 0) return;
            capacityDay.roadmapHours += hours;
            capacityDay.roadmapDays.push({
                roadmapId: getRoadmapId(roadmap),
                goal: roadmap.goal ?? '',
                dayNumber: day.dayNumber,
                hours,
            });
        });
    });

    capacityDays.forEach(setCapacityLoad);

    const freeHoursNext7Days = r2(
        capacityDays.slice(0, 7).reduce((sum, day) => sum + day.freeHours, 0)
    );
    return {
        today: todayKey,
        availableHours,
        days: capacityDays,
        summary: {
            freeHoursNext7Days,
            overloadedDays: capacityDays.filter((day) => day.load === 'overloaded').length,
            overdueTasks: overdueTaskIds.size,
            behindRoadmapDays,
        },
    };
};

const taskTitleList = (tasks) => {
    const titles = tasks.slice(0, 3).map((task) => task.title || 'Untitled task');
    const remaining = tasks.length - titles.length;
    if (remaining > 0) titles.push(`and ${remaining} more`);
    return titles.join(', ');
};

export const detectConflictsCore = ({
    user,
    tasks = [],
    roadmaps = [],
    today = new Date(),
}) => {
    const todayKey = istDayKey(today);
    const lastDate = addDaysToKey(todayKey, HORIZON_DAYS - 1);
    const availableHours = effectiveDailyHours(user);
    const countedTasks = (tasks ?? []).filter(isCountedTask);
    const conflicts = [];
    const overdueTasks = countedTasks.filter((task) => toDayKey(task.deadline) < todayKey);

    if (overdueTasks.length > 0) {
        const overdueHours = r2(overdueTasks.reduce((sum, task) => sum + toHours(task.estimatedHours), 0));
        conflicts.push({
            id: 'overdue',
            type: 'overdue',
            severity: 'high',
            message: `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'task' : 'tasks'} (${taskTitleList(overdueTasks)}) need ${overdueHours} hours as of ${formatDayKey(todayKey)}.`,
            dates: [todayKey],
            taskIds: overdueTasks.map(getTaskId),
        });
    }

    const deadlineTasks = countedTasks
        .filter((task) => {
            const date = toDayKey(task.deadline);
            return date >= todayKey && date <= lastDate;
        })
        .sort((taskA, taskB) => (
            toDayKey(taskA.deadline).localeCompare(toDayKey(taskB.deadline))
            || getTaskId(taskA).localeCompare(getTaskId(taskB))
        ));

    let deadlineChain = [];
    const reportDeadlineChain = () => {
        if (deadlineChain.length < 2) return;
        const firstDeadline = toDayKey(deadlineChain[0].deadline);
        const lastDeadline = toDayKey(deadlineChain[deadlineChain.length - 1].deadline);
        const totalHours = r2(deadlineChain.reduce((sum, task) => sum + toHours(task.estimatedHours), 0));
        const taskIds = deadlineChain.map(getTaskId);
        const severity = deadlineChain.some((task) => task.category === 'assessment')
            || totalHours > availableHours + EPS
            ? 'high'
            : 'medium';
        conflicts.push({
            id: `deadline_cluster:${taskIds.join(',')}`,
            type: 'deadline_cluster',
            severity,
            message: `${taskTitleList(deadlineChain)} are due from ${formatDayKey(firstDeadline)} to ${formatDayKey(lastDeadline)} and need ${totalHours} hours.`,
            dates: [...new Set([firstDeadline, lastDeadline])],
            taskIds,
        });
    };

    deadlineTasks.forEach((task) => {
        const deadlineKey = toDayKey(task.deadline);
        const previous = deadlineChain[deadlineChain.length - 1];
        if (previous && diffDays(toDayKey(previous.deadline), deadlineKey) > 2) {
            reportDeadlineChain();
            deadlineChain = [];
        }
        deadlineChain.push(task);
    });
    reportDeadlineChain();

    const capacity = computeCapacity({
        user,
        tasks,
        roadmaps,
        today,
        days: HORIZON_DAYS,
    });
    capacity.days.forEach((day) => {
        const contributingTaskIds = day.tasks.map((task) => task.taskId);
        if (day.taskHours > day.availableHours + EPS) {
            const taskTitles = day.tasks.map((task) => ({ title: task.title }));
            conflicts.push({
                id: `overloaded_day:${day.date}`,
                type: 'overloaded_day',
                severity: 'high',
                message: `${taskTitleList(taskTitles)} need ${day.taskHours} task hours on ${formatDayKey(day.date)}, exceeding daily capacity.`,
                dates: [day.date],
                taskIds: contributingTaskIds,
                hoursOver: r2(day.taskHours - day.availableHours),
            });
            return;
        }
        if (day.taskHours <= day.availableHours + EPS && day.totalHours > day.availableHours + EPS) {
            conflicts.push({
                id: `roadmap_crowded:${day.date}`,
                type: 'roadmap_crowded',
                severity: 'medium',
                message: `Roadmap study on ${formatDayKey(day.date)} does not fit around your tasks; re-planning can move it.`,
                dates: [day.date],
                taskIds: contributingTaskIds,
            });
        }
    });

    return conflicts.sort((conflictA, conflictB) => (
        (conflictA.severity === 'high' ? 0 : 1) - (conflictB.severity === 'high' ? 0 : 1)
        || conflictA.dates[0].localeCompare(conflictB.dates[0])
    ));
};

export const conflictsInvolving = (conflicts, taskIds) => {
    const requestedIds = new Set((taskIds ?? []).map(String));
    return (conflicts ?? []).filter((conflict) => (
        conflict.taskIds.some((taskId) => requestedIds.has(String(taskId)))
    ));
};
