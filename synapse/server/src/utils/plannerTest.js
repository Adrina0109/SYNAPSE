import assert from 'node:assert/strict';
import {
    computeCapacity,
    conflictsInvolving,
    detectConflictsCore,
    getTaskPlan,
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

if (failures > 0) process.exitCode = 1;
