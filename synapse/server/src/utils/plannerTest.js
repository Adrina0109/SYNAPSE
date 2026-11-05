import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    computeCapacity,
    conflictsInvolving,
    detectConflictsCore,
    getTaskPlan,
    planReplanCore,
    applyPlansToFixtures,
} from './plannerCore.js';

const today = new Date('2026-11-05T09:00:00+05:30');
const user = { dailyHours: 4 };
const taskA = {
    _id: 'task-a',
    title: 'DBMS assignment',
    status: 'pending',
    category: 'assignment',
    estimatedHours: 6,
    deadline: new Date('2026-11-09T00:00:00+05:30'),
};
const taskB = {
    _id: 'task-b',
    title: 'OS lab record',
    status: 'in_progress',
    category: 'assignment',
    estimatedHours: 3,
    deadline: new Date('2026-11-08T00:00:00+05:30'),
};
const roadmap = {
    _id: 'roadmap-react',
    goal: 'React',
    status: 'active',
    days: Array.from({ length: 5 }, (_, index) => ({
        dayNumber: index + 1,
        date: new Date(`2026-11-${String(index + 6).padStart(2, '0')}T00:00:00+05:30`),
        estimatedHours: 2,
        completed: false,
    })),
};
const dayAt = (capacity, date) => capacity.days.find((day) => day.date === date);

let failures = 0;
const check = (name, assertion) => {
    try {
        assertion();
        console.log(`PASS ${name}`);
    } catch (error) {
        failures += 1;
        console.error(`FAIL ${name}: ${error.message}`);
    }
};

const initialCapacity = computeCapacity({
    user,
    tasks: [taskA, taskB],
    roadmaps: [roadmap],
    today,
    days: 14,
});
const initialConflicts = detectConflictsCore({
    user,
    tasks: [taskA, taskB],
    roadmaps: [roadmap],
    today,
});

check('capacity matches the expected 14-day task and roadmap load', () => {
    assert.equal(dayAt(initialCapacity, '2026-11-05').load, 'light');
    assert.equal(dayAt(initialCapacity, '2026-11-06').totalHours, 3);
    assert.equal(dayAt(initialCapacity, '2026-11-06').load, 'normal');
    assert.equal(dayAt(initialCapacity, '2026-11-06').freeHours, 1);
    assert.equal(dayAt(initialCapacity, '2026-11-07').taskHours, 3);
    assert.equal(dayAt(initialCapacity, '2026-11-07').roadmapHours, 2);
    assert.equal(dayAt(initialCapacity, '2026-11-07').load, 'overloaded');
    assert.equal(dayAt(initialCapacity, '2026-11-08').totalHours, 5);
    assert.equal(dayAt(initialCapacity, '2026-11-08').load, 'overloaded');
    assert.equal(dayAt(initialCapacity, '2026-11-09').totalHours, 4);
    assert.equal(dayAt(initialCapacity, '2026-11-09').load, 'heavy');
    assert.equal(dayAt(initialCapacity, '2026-11-10').totalHours, 2);
    assert.equal(dayAt(initialCapacity, '2026-11-10').load, 'normal');
});

check('roadmap crowding conflicts are reported without task-overload conflicts', () => {
    assert.deepEqual(
        initialConflicts.filter((conflict) => conflict.type === 'roadmap_crowded').map((conflict) => conflict.dates[0]),
        ['2026-11-07', '2026-11-08']
    );
    assert.equal(initialConflicts.some((conflict) => conflict.type === 'overloaded_day'), false);
});

const taskC = {
    _id: 'task-c',
    title: 'Computer Networks exam',
    status: 'pending',
    category: 'assessment',
    estimatedHours: 8,
    deadline: new Date('2026-11-07T00:00:00+05:30'),
};
const taskCPlan = getTaskPlan(taskC, today);
const capacityWithAssessment = computeCapacity({
    user,
    tasks: [taskA, taskB, taskC],
    roadmaps: [roadmap],
    today,
    days: 14,
});
const conflictsWithAssessment = detectConflictsCore({
    user,
    tasks: [taskA, taskB, taskC],
    roadmaps: [roadmap],
    today,
});

check('assessment work defaults to the expected quarter-hour spread', () => {
    assert.deepEqual(taskCPlan, [
        { date: '2026-11-05', hours: 2.75 },
        { date: '2026-11-06', hours: 2.75 },
        { date: '2026-11-07', hours: 2.5 },
    ]);
});

check('task overload reports the expected excess hours', () => {
    const conflict = conflictsWithAssessment.find((item) => (
        item.type === 'overloaded_day' && item.dates[0] === '2026-11-07'
    ));
    assert.ok(conflict);
    assert.equal(conflict.hoursOver, 1.5);
    assert.equal(dayAt(capacityWithAssessment, '2026-11-07').taskHours, 5.5);
});

check('three close deadlines produce a high-severity assessment cluster', () => {
    const conflict = conflictsWithAssessment.find((item) => item.type === 'deadline_cluster');
    assert.ok(conflict);
    assert.equal(conflict.severity, 'high');
    assert.deepEqual(conflict.taskIds, ['task-c', 'task-b', 'task-a']);
});

check('missing dailyHours uses the two-hour default', () => {
    const capacity = computeCapacity({ user: { dailyHours: null }, today, tasks: [], roadmaps: [], days: 1 });
    assert.equal(capacity.availableHours, 2);
});

check('overdue task hours are placed today and produce an overdue conflict', () => {
    const overdueTask = {
        _id: 'overdue-task',
        title: 'Late assignment',
        status: 'pending',
        estimatedHours: 2,
        deadline: new Date('2026-11-04T00:00:00+05:30'),
    };
    const capacity = computeCapacity({ user, tasks: [overdueTask], roadmaps: [], today, days: 1 });
    const conflicts = detectConflictsCore({ user, tasks: [overdueTask], roadmaps: [], today });
    assert.equal(dayAt(capacity, '2026-11-05').taskHours, 2);
    assert.equal(conflicts.find((item) => item.type === 'overdue')?.severity, 'high');
});

check('completed tasks and paused roadmaps do not add capacity load', () => {
    const completedTask = { ...taskA, _id: 'completed-task', status: 'completed' };
    const pausedRoadmap = { ...roadmap, _id: 'paused-roadmap', status: 'paused' };
    const capacity = computeCapacity({
        user,
        tasks: [completedTask],
        roadmaps: [pausedRoadmap],
        today,
        days: 14,
    });
    assert.equal(capacity.days.reduce((sum, day) => sum + day.taskHours + day.roadmapHours, 0), 0);
});

check('valid stored workPlan overrides the default spread', () => {
    const taskWithPlan = {
        ...taskA,
        workPlan: [
            { date: new Date('2026-11-06T00:00:00+05:30'), hours: 1 },
            { date: new Date('2026-11-07T00:00:00+05:30'), hours: 5 },
        ],
    };
    assert.deepEqual(getTaskPlan(taskWithPlan, today), [
        { date: '2026-11-06', hours: 1 },
        { date: '2026-11-07', hours: 5 },
    ]);
});

check('stored workPlan normalizes past and late dates and merges matching days', () => {
    const taskWithNormalizedPlan = {
        ...taskA,
        workPlan: [
            { date: new Date('2026-11-04T00:00:00+05:30'), hours: 1 },
            { date: new Date('2026-11-05T00:00:00+05:30'), hours: 2 },
            { date: new Date('2026-11-09T00:00:00+05:30'), hours: 2 },
            { date: new Date('2026-11-12T00:00:00+05:30'), hours: 1 },
        ],
    };
    assert.deepEqual(getTaskPlan(taskWithNormalizedPlan, today), [
        { date: '2026-11-05', hours: 3 },
        { date: '2026-11-09', hours: 3 },
    ]);
});

check('invalid stored workPlan falls back to default spread', () => {
    const taskWithInvalidPlan = {
        ...taskA,
        workPlan: [{ date: new Date('2026-11-06T00:00:00+05:30'), hours: 1 }],
    };
    assert.deepEqual(getTaskPlan(taskWithInvalidPlan, today), [
        { date: '2026-11-07', hours: 2 },
        { date: '2026-11-08', hours: 2 },
        { date: '2026-11-09', hours: 2 },
    ]);
});

check('conflictsInvolving compares task IDs as strings', () => {
    const filtered = conflictsInvolving(initialConflicts, ['task-a']);
    assert.ok(filtered.some((conflict) => conflict.type === 'deadline_cluster'));
    assert.ok(filtered.every((conflict) => conflict.taskIds.includes('task-a')));
});

const examReplan = planReplanCore({
    user,
    tasks: [taskA, taskB, taskC],
    roadmaps: [roadmap],
    today,
});
const replannedFixtures = applyPlansToFixtures(
    { tasks: [taskA, taskB, taskC], roadmaps: [roadmap] },
    examReplan
);
const replannedCapacity = computeCapacity({
    user,
    tasks: replannedFixtures.tasks,
    roadmaps: replannedFixtures.roadmaps,
    today,
    days: 30,
});

check('exam replan protects assessment work and fits task and roadmap load', () => {
    assert.equal(examReplan.hasChanges, true);
    assert.deepEqual(examReplan.shortfalls, []);
    assert.equal(
        getTaskPlan(replannedFixtures.tasks.find((task) => task._id === 'task-c'), today)
            .reduce((sum, entry) => sum + entry.hours, 0),
        8
    );
    assert.ok(examReplan.taskChanges.some((change) => (
        ['task-a', 'task-b'].includes(change.taskId)
        && change.moves.some((move) => move.reason === 'made_room' && move.to > move.from)
    )));
    assert.equal(examReplan.taskChanges.some((change) => change.taskId === 'task-c'), false);
    assert.ok(examReplan.roadmapChanges.length > 0);
    examReplan.newTaskPlans.forEach(({ taskId, plan }) => {
        const task = [taskA, taskB, taskC].find((entry) => entry._id === taskId);
        const deadline = new Date(task.deadline);
        plan.forEach(({ date }) => {
            assert.ok(new Date(`${date}T00:00:00+05:30`) <= deadline);
        });
    });
    assert.ok(replannedCapacity.days.every((day) => day.totalHours <= 4));
    const placedDays = replannedFixtures.roadmaps[0].days;
    const placedDates = placedDays.map((day) => day.date.toISOString());
    assert.equal(new Set(placedDates).size, placedDates.length);
    assert.ok(placedDays.every((day, index) => (
        index === 0 || day.date.getTime() > placedDays[index - 1].date.getTime()
    )));
});

check('replanning an applied result is idempotent', () => {
    const secondResult = planReplanCore({
        user,
        tasks: replannedFixtures.tasks,
        roadmaps: replannedFixtures.roadmaps,
        today,
    });
    assert.equal(secondResult.hasChanges, false);
    assert.deepEqual(secondResult.newTaskPlans, []);
    assert.deepEqual(secondResult.roadmapDateUpdates, []);
});

check('replan fingerprint is the stable hash of plan updates', () => {
    const payload = {
        newTaskPlans: examReplan.newTaskPlans.map(({ taskId, plan }) => ({
            taskId,
            plan: plan.map(({ date, hours }) => ({ date, hours })),
        })),
        roadmapDateUpdates: examReplan.roadmapDateUpdates.map(({ roadmapId, dayNumber, date }) => ({
            roadmapId,
            dayNumber,
            date,
        })),
    };
    const fingerprint = createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex')
        .slice(0, 16);
    assert.equal(examReplan.fingerprint, fingerprint);
});

check('already-fitting tasks with eight daily hours need no changes', () => {
    const result = planReplanCore({
        user: { dailyHours: 8 },
        tasks: [taskA, taskB],
        roadmaps: [],
        today,
    });
    assert.equal(result.hasChanges, false);
});

check('an impossible assessment reports four total shortfall hours without moving past deadline', () => {
    const impossibleAssessment = {
        _id: 'impossible-exam',
        title: 'Large exam',
        status: 'pending',
        category: 'assessment',
        priority: 'high',
        estimatedHours: 12,
        deadline: new Date('2026-11-06T00:00:00+05:30'),
    };
    const result = planReplanCore({
        user,
        tasks: [impossibleAssessment],
        roadmaps: [],
        today,
    });
    assert.equal(result.summary.shortfallHours, 4);
    assert.deepEqual(result.shortfalls.map((shortfall) => shortfall.hoursOver), [2, 2]);
    assert.ok(getTaskPlan(impossibleAssessment, today).every(({ date }) => date <= '2026-11-06'));
    result.newTaskPlans.forEach(({ plan }) => {
        assert.ok(plan.every(({ date }) => date <= '2026-11-06'));
    });
});

check('behind roadmap days are placed from today with the correct reason', () => {
    const behindRoadmap = {
        _id: 'roadmap-behind',
        goal: 'Behind plan',
        status: 'active',
        createdAt: new Date('2026-10-01T00:00:00+05:30'),
        days: [
            { dayNumber: 1, date: new Date('2026-11-03T00:00:00+05:30'), estimatedHours: 2, completed: false },
            { dayNumber: 2, date: new Date('2026-11-04T00:00:00+05:30'), estimatedHours: 2, completed: false },
        ],
    };
    const result = planReplanCore({ user, tasks: [], roadmaps: [behindRoadmap], today });
    assert.deepEqual(result.roadmapChanges.map((change) => change.newDate), [
        '2026-11-05',
        '2026-11-06',
    ]);
    assert.ok(result.roadmapChanges.every((change) => change.reason === 'behind_schedule'));
});

check('completed tasks, deadline-free tasks, and paused roadmaps are ignored', () => {
    const completedTask = { ...taskA, _id: 'completed-ignored', status: 'completed' };
    const noDeadlineTask = { ...taskB, _id: 'no-deadline', deadline: null };
    const pausedRoadmap = { ...roadmap, _id: 'paused-ignored', status: 'paused' };
    const result = planReplanCore({
        user,
        tasks: [completedTask, noDeadlineTask],
        roadmaps: [pausedRoadmap],
        today,
    });
    assert.equal(result.hasChanges, false);
    assert.deepEqual(result.taskChanges, []);
    assert.deepEqual(result.roadmapChanges, []);
});

if (failures > 0) process.exitCode = 1;
