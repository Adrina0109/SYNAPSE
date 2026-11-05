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
 * R8: Re-planning starts with getTaskPlan for each counted task. Record stored
 * workPlan entries moved from before today to today as overdue_to_today moves.
 * R9: Repair task-only overloads from today through the latest deadline. Move
 * work into free capacity before or after its current date, never outside its
 * deadline. Prefer non-assessments, lower priority, later deadlines, then
 * larger daily contributions. Record and merge each made_room move.
 * R10: Remaining task-only overloads are reported as shortfalls; deadlines and
 * daily capacity are never violated to invent time.
 * R11: Place active incomplete roadmap days after tasks, in roadmap creation
 * order and day-number order, preserving each roadmap's day order and assigning
 * the earliest eligible date with sufficient remaining capacity.
 * R12: Return only changed plans and dates, a deterministic summary, and a
 * stable SHA-256 fingerprint of the resulting plan updates.
 */
import { createHash } from 'node:crypto';
import {
    addDaysToKey,
    dayKeyToDate,
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

const hasValidStoredWorkPlan = (task) => {
    if (!Array.isArray(task.workPlan) || task.workPlan.length === 0) return false;
    const entries = task.workPlan.map((entry) => ({
        date: toDayKey(entry.date),
        hours: Number(entry.hours),
    }));
    return entries.every(({ date, hours }) => (
        date !== null && Number.isFinite(hours) && hours >= 0
    )) && Math.abs(
        entries.reduce((sum, entry) => sum + entry.hours, 0) - toHours(task.estimatedHours)
    ) <= 0.05;
};

const getTaskId = (task) => String(task._id ?? task.id ?? '');
const getRoadmapId = (roadmap) => String(roadmap._id ?? roadmap.id ?? '');

const toTimestamp = (value) => {
    if (value === null || value === undefined) return null;
    const timestamp = (value instanceof Date ? value : new Date(value)).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
};

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

const MAX_SEARCH_DAYS = 120;
const PRIORITY_ORDER = { low: 0, medium: 1, high: 2 };

const addPlanHours = (plan, date, hours) => {
    const updatedHours = r2((plan.get(date) ?? 0) + hours);
    if (updatedHours <= EPS) plan.delete(date);
    else plan.set(date, updatedHours);
};

const compareTasksForRepair = (taskA, hoursA, taskB, hoursB) => (
    Number(taskA.category === 'assessment') - Number(taskB.category === 'assessment')
    || (PRIORITY_ORDER[taskA.priority] ?? PRIORITY_ORDER.medium)
        - (PRIORITY_ORDER[taskB.priority] ?? PRIORITY_ORDER.medium)
    || toDayKey(taskB.deadline).localeCompare(toDayKey(taskA.deadline))
    || hoursB - hoursA
    || getTaskId(taskA).localeCompare(getTaskId(taskB))
);

const mergeTaskMove = (movesByTask, taskId, move) => {
    if (!movesByTask.has(taskId)) movesByTask.set(taskId, new Map());
    const taskMoves = movesByTask.get(taskId);
    const moveKey = `${move.from}|${move.to}|${move.reason}`;
    const existing = taskMoves.get(moveKey);
    if (existing) existing.hours = r2(existing.hours + move.hours);
    else taskMoves.set(moveKey, { ...move, hours: r2(move.hours) });
};

const makeStableResult = (result) => {
    const stablePayload = {
        newTaskPlans: result.newTaskPlans.map(({ taskId, plan }) => ({
            taskId,
            plan: plan.map(({ date, hours }) => ({ date, hours })),
        })),
        roadmapDateUpdates: result.roadmapDateUpdates.map(({ roadmapId, dayNumber, date }) => ({
            roadmapId,
            dayNumber,
            date,
        })),
    };
    result.fingerprint = createHash('sha256')
        .update(JSON.stringify(stablePayload))
        .digest('hex')
        .slice(0, 16);
    result.hasChanges = stablePayload.newTaskPlans.length > 0
        || stablePayload.roadmapDateUpdates.length > 0;
    return result;
};

export const planReplanCore = ({
    user,
    tasks = [],
    roadmaps = [],
    today = new Date(),
}) => {
    const todayKey = istDayKey(today);
    const availableHours = effectiveDailyHours(user);
    const countedTasks = (tasks ?? []).filter(isCountedTask);
    const taskById = new Map(countedTasks.map((task) => [getTaskId(task), task]));
    const plansByTask = new Map();
    const movesByTask = new Map();
    const allMoves = [];

    countedTasks.forEach((task) => {
        const taskId = getTaskId(task);
        const plan = new Map(getTaskPlan(task, today).map(({ date, hours }) => [date, hours]));
        plansByTask.set(taskId, plan);

        if (hasValidStoredWorkPlan(task)) {
            task.workPlan.forEach((entry) => {
                const from = toDayKey(entry.date);
                const hours = toHours(entry.hours);
                if (!from || from >= todayKey || hours <= 0) return;
                const move = { from, to: todayKey, hours: r2(hours), reason: 'overdue_to_today' };
                mergeTaskMove(movesByTask, taskId, move);
                allMoves.push({ taskId, ...move });
            });
        }
    });

    const taskHoursByDate = new Map();
    const addTaskHours = (date, hours) => {
        taskHoursByDate.set(date, r2((taskHoursByDate.get(date) ?? 0) + hours));
    };
    plansByTask.forEach((plan) => plan.forEach((hours, date) => addTaskHours(date, hours)));

    const latestDeadline = countedTasks.reduce(
        (latest, task) => {
            const deadline = toDayKey(task.deadline);
            return deadline > latest ? deadline : latest;
        },
        todayKey
    );
    const repairDates = Array.from(
        { length: diffDays(todayKey, latestDeadline) + 1 },
        (_, index) => addDaysToKey(todayKey, index)
    );
    const freeTaskCapacity = (date) => r2(
        availableHours - (taskHoursByDate.get(date) ?? 0)
    );

    repairDates.forEach((date) => {
        let excess = r2((taskHoursByDate.get(date) ?? 0) - availableHours);
        while (excess > EPS) {
            const contributors = countedTasks
                .filter((task) => (plansByTask.get(getTaskId(task)).get(date) ?? 0) > EPS)
                .sort((taskA, taskB) => compareTasksForRepair(
                    taskA,
                    plansByTask.get(getTaskId(taskA)).get(date),
                    taskB,
                    plansByTask.get(getTaskId(taskB)).get(date)
                ));
            let movedInPass = 0;

            for (const task of contributors) {
                const taskId = getTaskId(task);
                const taskPlan = plansByTask.get(taskId);
                let remainingToMove = r2(Math.min(
                    excess,
                    taskPlan.get(date) ?? 0
                ));
                if (remainingToMove <= EPS) continue;

                const deadlineKey = toDayKey(task.deadline);
                const isOverdue = deadlineKey < todayKey;
                const laterDates = isOverdue ? [] : Array.from(
                    { length: Math.max(0, diffDays(date, deadlineKey)) },
                    (_, index) => addDaysToKey(date, index + 1)
                );
                const earlierDates = Array.from(
                    { length: Math.max(0, diffDays(todayKey, date)) },
                    (_, index) => addDaysToKey(date, -(index + 1))
                ).filter((candidate) => candidate >= todayKey);
                const destinations = [...laterDates, ...earlierDates];
                let movedForTask = 0;

                destinations.forEach((destination) => {
                    if (remainingToMove <= EPS) return;
                    const freeHours = freeTaskCapacity(destination);
                    if (freeHours <= EPS) return;
                    const movedHours = r2(Math.min(remainingToMove, freeHours));
                    if (movedHours <= EPS) return;

                    addPlanHours(taskPlan, date, -movedHours);
                    addPlanHours(taskPlan, destination, movedHours);
                    addTaskHours(date, -movedHours);
                    addTaskHours(destination, movedHours);
                    remainingToMove = r2(remainingToMove - movedHours);
                    movedForTask = r2(movedForTask + movedHours);
                    movedInPass = r2(movedInPass + movedHours);
                    const move = {
                        from: date,
                        to: destination,
                        hours: movedHours,
                        reason: 'made_room',
                    };
                    mergeTaskMove(movesByTask, taskId, move);
                    allMoves.push({ taskId, ...move });
                });

                excess = r2(excess - movedForTask);
                if (excess <= EPS) break;
            }

            if (movedInPass <= EPS) break;
        }
    });

    const shortfalls = repairDates
        .map((date) => {
            const hoursOver = r2((taskHoursByDate.get(date) ?? 0) - availableHours);
            if (hoursOver <= EPS) return null;
            const contributingTasks = countedTasks.filter(
                (task) => (plansByTask.get(getTaskId(task)).get(date) ?? 0) > EPS
            );
            return {
                date,
                hoursOver,
                taskIds: contributingTasks.map(getTaskId),
                titles: contributingTasks.map((task) => task.title ?? ''),
            };
        })
        .filter(Boolean);

    const remainingHoursByDate = new Map();
    taskHoursByDate.forEach((hours, date) => {
        remainingHoursByDate.set(date, r2(availableHours - hours));
    });
    const getRemaining = (date) => (
        remainingHoursByDate.get(date) ?? availableHours
    );
    const setRemaining = (date, hours) => remainingHoursByDate.set(date, r2(hours));
    const activeRoadmaps = (roadmaps ?? [])
        .filter((roadmap) => roadmap.status === 'active')
        .sort((roadmapA, roadmapB) => {
            const timestampA = toTimestamp(roadmapA.createdAt) ?? toTimestamp(roadmapA.startDate) ?? 0;
            const timestampB = toTimestamp(roadmapB.createdAt) ?? toTimestamp(roadmapB.startDate) ?? 0;
            return timestampA - timestampB
                || getRoadmapId(roadmapA).localeCompare(getRoadmapId(roadmapB));
        });
    const roadmapChanges = [];
    const roadmapDateUpdates = [];
    const unplacedRoadmapDays = [];
    const roadmapEndDates = [];

    activeRoadmaps.forEach((roadmap) => {
        const roadmapId = getRoadmapId(roadmap);
        const incompleteDays = (roadmap.days ?? [])
            .filter((day) => !day.completed && toDayKey(day.date))
            .sort((dayA, dayB) => (
                Number(dayA.dayNumber) - Number(dayB.dayNumber)
                || toDayKey(dayA.date).localeCompare(toDayKey(dayB.date))
            ));
        let previousPlacedDate = null;
        let newEnd = null;

        incompleteDays.forEach((day) => {
            const oldDate = toDayKey(day.date);
            const required = roadmapDayHours(day, availableHours);
            const originalFreeHours = getRemaining(oldDate);
            const orderDate = previousPlacedDate
                ? addDaysToKey(previousPlacedDate, 1)
                : todayKey;
            const candidateStart = [todayKey, oldDate, orderDate]
                .sort((dateA, dateB) => dateA.localeCompare(dateB))
                .pop();
            let newDate = null;
            for (let offset = 0; offset < MAX_SEARCH_DAYS; offset += 1) {
                const candidate = addDaysToKey(candidateStart, offset);
                if (getRemaining(candidate) + EPS >= required) {
                    newDate = candidate;
                    setRemaining(candidate, getRemaining(candidate) - required);
                    break;
                }
            }

            if (!newDate) {
                newDate = oldDate;
                unplacedRoadmapDays.push({ roadmapId, dayNumber: day.dayNumber });
            }
            previousPlacedDate = newDate;
            newEnd = newEnd && newEnd > newDate ? newEnd : newDate;

            if (newDate !== oldDate) {
                const reason = oldDate < todayKey
                    ? 'behind_schedule'
                    : originalFreeHours + EPS < required
                        ? 'not_enough_free_hours'
                        : 'shifted_to_keep_order';
                roadmapChanges.push({
                    roadmapId,
                    goal: roadmap.goal ?? '',
                    dayNumber: day.dayNumber,
                    oldDate,
                    newDate,
                    reason,
                });
                roadmapDateUpdates.push({ roadmapId, dayNumber: day.dayNumber, date: newDate });
            }
        });

        const oldEnd = (roadmap.days ?? []).reduce((latest, day) => {
            const date = toDayKey(day.date);
            return !latest || date > latest ? date : latest;
        }, null);
        roadmapEndDates.push({
            roadmapId,
            goal: roadmap.goal ?? '',
            oldEnd,
            newEnd: (roadmap.days ?? []).reduce((latest, day) => {
                const originalDate = toDayKey(day.date);
                const placedDate = !day.completed
                    ? roadmapChanges.find((change) => (
                        change.roadmapId === roadmapId && change.dayNumber === day.dayNumber
                    ))?.newDate ?? originalDate
                    : originalDate;
                return !latest || placedDate > latest ? placedDate : latest;
            }, newEnd),
        });
    });

    const newTaskPlans = [];
    const taskChanges = [];
    plansByTask.forEach((plan, taskId) => {
        const task = taskById.get(taskId);
        const startingPlan = new Map(getTaskPlan(task, today).map(({ date, hours }) => [date, hours]));
        const finalPlan = [...plan.entries()]
            .filter(([, hours]) => hours > EPS)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, hours]) => ({ date, hours: r2(hours) }));
        const taskMoves = [...(movesByTask.get(taskId)?.values() ?? [])]
            .sort((moveA, moveB) => (
                moveA.from.localeCompare(moveB.from)
                || moveA.to.localeCompare(moveB.to)
                || moveA.reason.localeCompare(moveB.reason)
            ));
        const wasNormalizedFromStoredPlan = taskMoves.some((move) => move.reason === 'overdue_to_today');
        const planChanged = wasNormalizedFromStoredPlan
            || finalPlan.length !== startingPlan.size
            || finalPlan.some(({ date, hours }) => Math.abs((startingPlan.get(date) ?? 0) - hours) > EPS);
        if (!planChanged) return;

        newTaskPlans.push({ taskId, plan: finalPlan });
        taskChanges.push({
            taskId,
            title: task.title ?? '',
            deadline: toDayKey(task.deadline),
            moves: taskMoves,
        });
    });

    newTaskPlans.sort((entryA, entryB) => entryA.taskId.localeCompare(entryB.taskId));
    taskChanges.sort((entryA, entryB) => entryA.taskId.localeCompare(entryB.taskId));
    roadmapChanges.sort((entryA, entryB) => (
        entryA.roadmapId.localeCompare(entryB.roadmapId)
        || entryA.dayNumber - entryB.dayNumber
    ));
    roadmapDateUpdates.sort((entryA, entryB) => (
        entryA.roadmapId.localeCompare(entryB.roadmapId)
        || entryA.dayNumber - entryB.dayNumber
    ));

    const hoursMoved = r2(allMoves.reduce((sum, move) => sum + move.hours, 0));
    const shortfallHours = r2(shortfalls.reduce((sum, item) => sum + item.hoursOver, 0));
    const result = {
        hasChanges: false,
        availableHours,
        taskChanges,
        roadmapChanges,
        shortfalls,
        newTaskPlans,
        roadmapDateUpdates,
        summary: {
            tasksAffected: newTaskPlans.length,
            hoursMoved,
            roadmapDaysMoved: roadmapDateUpdates.length,
            shortfallHours,
            unplacedRoadmapDays: unplacedRoadmapDays.length,
            roadmapEndDates,
        },
        fingerprint: '',
    };
    return makeStableResult(result);
};

export const applyPlansToFixtures = ({ tasks = [], roadmaps = [] }, result) => {
    const plansByTask = new Map(result.newTaskPlans.map(({ taskId, plan }) => [taskId, plan]));
    const roadmapDates = new Map(
        result.roadmapDateUpdates.map(({ roadmapId, dayNumber, date }) => [
            `${roadmapId}|${dayNumber}`,
            date,
        ])
    );
    return {
        tasks: (tasks ?? []).map((task) => {
            const plan = plansByTask.get(getTaskId(task));
            if (!plan) return { ...task };
            return {
                ...task,
                workPlan: plan.map(({ date, hours }) => ({
                    date: dayKeyToDate(date),
                    hours: r2(hours),
                })),
            };
        }),
        roadmaps: (roadmaps ?? []).map((roadmap) => ({
            ...roadmap,
            days: (roadmap.days ?? []).map((day) => {
                const date = roadmapDates.get(`${getRoadmapId(roadmap)}|${day.dayNumber}`);
                return date ? { ...day, date: dayKeyToDate(date) } : { ...day };
            }),
        })),
    };
};
