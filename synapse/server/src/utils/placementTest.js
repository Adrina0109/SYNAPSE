import assert from 'node:assert/strict';
import {
    findSkillsInText,
    getRoleSkills,
    normalizeSkill,
    ROLE_SKILLS,
} from '../data/skillCatalog.js';
import {
    computeReadiness,
    computeWhatIf,
    nextBestAction,
    WEIGHTS,
} from '../services/readinessCore.js';
import { checkDriveEligibility } from '../services/driveEligibility.js';

let failures = 0;

const check = (name, assertion) => {
    try {
        assertion();
        console.log(`PASS ${name}`);
    } catch (error) {
        failures += 1;
        console.log(`FAIL ${name}: ${error.message}`);
    }
};

check('normalizes React.js alias', () => {
    assert.equal(normalizeSkill('React.js'), 'react');
});

check('normalizes Node.JS alias with whitespace', () => {
    assert.equal(normalizeSkill('  Node.JS '), 'node');
});

check('matches canonical skills and aliases in text', () => {
    const skills = findSkillsInText('Built a ReactJS app with Node.js and PostgreSQL');
    assert.ok(skills.includes('react'));
    assert.ok(skills.includes('node'));
    assert.ok(skills.includes('postgresql'));
});

check('does not match unrelated skills', () => {
    assert.ok(!findSkillsInText('I know Javascript').includes('express'));
});

check('unknown role has no skills', () => {
    assert.deepEqual(getRoleSkills('Unknown Role'), []);
});

check('each role has at least four skills', () => {
    Object.values(ROLE_SKILLS).forEach((skills) => assert.ok(skills.length >= 4));
});

const now = new Date('2026-11-05T12:00:00.000Z');
const createStrongInputs = () => {
    const roleSkills = getRoleSkills('Full Stack Developer');
    return {
        now,
        user: {
            cgpa: 9,
            backlogs: 0,
            targetRole: 'Full Stack Developer',
            declaredSkills: [],
        },
        roadmaps: [{
            id: 'full-stack',
            goal: 'Full stack',
            status: 'completed',
            completedDays: 10,
            totalDays: 10,
            skills: roleSkills,
            verifiedSkills: roleSkills,
        }],
        tasks: [{
            deadline: new Date('2026-11-01T12:00:00.000Z'),
            completedAt: new Date('2026-10-31T12:00:00.000Z'),
            status: 'completed',
        }],
        checklist: {
            totalItems: 5,
            tickedItems: 5,
            nextUnticked: null,
            mockRating: 5,
        },
    };
};

const emptyInputs = {
    now,
    user: {
        cgpa: null,
        backlogs: null,
        targetRole: null,
        declaredSkills: [],
    },
    roadmaps: [],
    tasks: [],
    checklist: {
        totalItems: 0,
        tickedItems: 0,
        nextUnticked: null,
        mockRating: null,
    },
};

check('empty student readiness has five factors and weights totaling 100', () => {
    const result = computeReadiness(emptyInputs);
    assert.ok(result.score >= 0 && result.score <= 20);
    assert.equal(result.breakdown.length, 5);
    assert.equal(result.breakdown.reduce((sum, item) => sum + item.weight, 0), 100);
    assert.equal(Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0), 100);
});

check('strong student readiness is above 90', () => {
    assert.ok(computeReadiness(createStrongInputs()).score > 90);
});

check('verified role skills score above declared skills', () => {
    const declared = {
        ...emptyInputs,
        user: { ...emptyInputs.user, targetRole: 'Full Stack Developer', declaredSkills: ['react'] },
    };
    const verified = {
        ...declared,
        roadmaps: [{
            id: 'verified',
            goal: 'React',
            status: 'active',
            completedDays: 0,
            totalDays: 1,
            skills: ['react'],
            verifiedSkills: ['react'],
        }],
    };
    const declaredValue = computeReadiness(declared).breakdown[2].value;
    const verifiedValue = computeReadiness(verified).breakdown[2].value;
    assert.ok(verifiedValue > declaredValue);
});

check('what-if completion increases readiness for an active roadmap', () => {
    const inputs = {
        ...emptyInputs,
        roadmaps: [{
            id: 'roadmap-1',
            goal: 'React',
            status: 'active',
            completedDays: 2,
            totalDays: 10,
            skills: [],
            verifiedSkills: [],
        }],
    };
    const result = computeWhatIf(inputs, 'roadmap-1');
    assert.ok(result.projected.score > result.current.score);
});

check('next best action recommends an active roadmap day', () => {
    const inputs = {
        ...createStrongInputs(),
        roadmaps: [{
            id: 'in-progress',
            goal: 'React',
            status: 'active',
            completedDays: 2,
            totalDays: 10,
            skills: getRoleSkills('Full Stack Developer'),
            verifiedSkills: getRoleSkills('Full Stack Developer'),
        }],
    };
    const action = nextBestAction(inputs);
    assert.equal(action?.kind, 'roadmap_day');
    assert.match(action.text, /Complete the next day of your React roadmap/);
});

check('strong student has no next best action', () => {
    assert.equal(nextBestAction(createStrongInputs()), null);
});

check('readiness suggestions do not mutate their inputs', () => {
    const inputs = {
        ...emptyInputs,
        user: { ...emptyInputs.user, targetRole: 'Full Stack Developer', declaredSkills: ['React.js'] },
        roadmaps: [{
            id: 'in-progress',
            goal: 'React',
            status: 'active',
            completedDays: 2,
            totalDays: 10,
            skills: ['react'],
            verifiedSkills: [],
        }],
        checklist: {
            totalItems: 3,
            tickedItems: 1,
            nextUnticked: { key: 'communication', label: 'Communication' },
            mockRating: null,
        },
    };
    const original = JSON.stringify(inputs);
    computeReadiness(inputs);
    computeWhatIf(inputs, 'in-progress');
    nextBestAction(inputs);
    assert.equal(JSON.stringify(inputs), original);
});

check('closed placement drive is not eligible', () => {
    const result = checkDriveEligibility({
        status: 'closed',
        date: new Date('2026-11-06T12:00:00.000Z'),
        minCgpa: 0,
        maxBacklogs: null,
        branches: [],
    }, { cgpa: 8, backlogs: 0, department: 'CSE' }, now);
    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, ['This drive is closed.']);
});

check('placement drive reports a CGPA below the minimum', () => {
    const result = checkDriveEligibility({
        status: 'open',
        date: new Date('2026-11-06T12:00:00.000Z'),
        minCgpa: 7,
        maxBacklogs: null,
        branches: [],
    }, { cgpa: 6.8, backlogs: 0, department: 'CSE' }, now);
    assert.deepEqual(result.reasons, ['Needs CGPA 7, you have 6.8.']);
});

check('placement drive asks student to add missing CGPA', () => {
    const result = checkDriveEligibility({
        status: 'open',
        date: new Date('2026-11-06T12:00:00.000Z'),
        minCgpa: 7,
        maxBacklogs: null,
        branches: [],
    }, { cgpa: null, backlogs: 0, department: 'CSE' }, now);
    assert.ok(result.reasons.includes('Add your CGPA in your profile to check eligibility.'));
});

check('placement drive branch comparison ignores case', () => {
    const result = checkDriveEligibility({
        status: 'open',
        date: new Date('2026-11-06T12:00:00.000Z'),
        minCgpa: 0,
        maxBacklogs: null,
        branches: ['CSE'],
    }, { cgpa: 8, backlogs: 0, department: 'cse' }, now);
    assert.equal(result.eligible, true);
    assert.deepEqual(result.reasons, []);
});

check('placement drive rejects a department outside allowed branches', () => {
    const result = checkDriveEligibility({
        status: 'open',
        date: new Date('2026-11-06T12:00:00.000Z'),
        minCgpa: 0,
        maxBacklogs: null,
        branches: ['CSE'],
    }, { cgpa: 8, backlogs: 0, department: 'ECE' }, now);
    assert.equal(result.eligible, false);
    assert.ok(result.reasons[0].startsWith('Open to CSE, your department is ECE.'));
});

if (failures > 0) process.exitCode = 1;
