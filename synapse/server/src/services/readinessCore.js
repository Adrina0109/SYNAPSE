/*
 * F1 Skill progress (25 points): average completion percentage across roadmaps
 * not paused; a zero-day roadmap contributes zero. No eligible roadmaps means
 * zero progress.
 * F2 Discipline (25 points): among tasks due before now, average the completed
 * rate and the on-time rate. No past deadlines means zero and a specific note.
 * F3 Role match (20 points): each required role skill is worth 1 when verified,
 * 0.6 when declared, otherwise zero. Missing or unknown roles score zero.
 * F4 Academics (15 points): score CGPA and backlogs as 0.7*(CGPA/10) +
 * 0.3*max(0, 1 - 0.25*backlogs); a null CGPA scores zero.
 * F5 Interview prep (15 points): combine checklist completion (70%) and mock
 * interview rating out of five (30%). Missing values contribute zero.
 * Each factor value is clamped to 0..1 and contributes its weight times value.
 */
import { getRoleSkills, normalizeSkill } from '../data/skillCatalog.js';

export const WEIGHTS = {
    skills: 25,
    discipline: 25,
    roleMatch: 20,
    academics: 15,
    interview: 15,
};

const FACTOR_NAMES = [
    'Skill progress',
    'Discipline',
    'Role match',
    'Academics',
    'Interview prep',
];

const clamp01 = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const numeric = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const validTimestamp = (value) => {
    if (value === null || value === undefined) return null;
    const timestamp = (value instanceof Date ? value : new Date(value)).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
};

const normalizedSet = (skills) => new Set(
    (Array.isArray(skills) ? skills : [])
        .map(normalizeSkill)
        .filter(Boolean)
);

const getFactorValues = (inputs = {}) => {
    const user = inputs.user ?? {};
    const roadmaps = Array.isArray(inputs.roadmaps) ? inputs.roadmaps : [];
    const tasks = Array.isArray(inputs.tasks) ? inputs.tasks : [];
    const checklist = inputs.checklist ?? {};
    const now = validTimestamp(inputs.now) ?? Date.now();

    const skillRoadmaps = roadmaps.filter((roadmap) => roadmap.status !== 'paused');
    const skillProgress = skillRoadmaps.length > 0
        ? skillRoadmaps.reduce((sum, roadmap) => {
            const completedDays = Math.max(0, numeric(roadmap.completedDays));
            const totalDays = Math.max(0, numeric(roadmap.totalDays));
            return sum + (totalDays > 0 ? Math.min(100, (completedDays / totalDays) * 100) : 0);
        }, 0) / skillRoadmaps.length / 100
        : 0;

    const pastDeadlineTasks = tasks.filter((task) => {
        const deadline = validTimestamp(task.deadline);
        return deadline !== null && deadline < now;
    });
    const dueCount = pastDeadlineTasks.length;
    const dueCompletedTasks = pastDeadlineTasks.filter((task) => task.status === 'completed');
    const onTimeCompletedCount = dueCompletedTasks.filter((task) => {
        const deadline = validTimestamp(task.deadline);
        const completedAt = validTimestamp(task.completedAt);
        return deadline !== null && completedAt !== null && completedAt <= deadline;
    }).length;
    const discipline = dueCount > 0
        ? (
            (dueCompletedTasks.length / dueCount)
            + (dueCompletedTasks.length > 0 ? onTimeCompletedCount / dueCompletedTasks.length : 0)
        ) / 2
        : 0;

    const requiredSkills = getRoleSkills(user.targetRole);
    const verifiedSkills = new Set(
        roadmaps.flatMap((roadmap) => Array.isArray(roadmap.verifiedSkills) ? roadmap.verifiedSkills : [])
            .map(normalizeSkill)
            .filter(Boolean)
    );
    const declaredSkills = normalizedSet(user.declaredSkills);
    const roleMatch = requiredSkills.length > 0
        ? requiredSkills.reduce((sum, skill) => (
            sum + (verifiedSkills.has(skill) ? 1 : declaredSkills.has(skill) ? 0.6 : 0)
        ), 0) / requiredSkills.length
        : 0;

    const cgpa = user.cgpa === null || user.cgpa === undefined
        ? null
        : numeric(user.cgpa);
    const backlogs = Math.max(0, numeric(user.backlogs));
    const academics = cgpa === null
        ? 0
        : (0.7 * (cgpa / 10)) + (0.3 * Math.max(0, 1 - (0.25 * backlogs)));

    const totalItems = Math.max(0, numeric(checklist.totalItems));
    const tickedItems = Math.max(0, numeric(checklist.tickedItems));
    const checklistRate = totalItems > 0 ? Math.min(1, tickedItems / totalItems) : 0;
    const mockRating = checklist.mockRating === null || checklist.mockRating === undefined
        ? 0
        : numeric(checklist.mockRating) / 5;
    const interview = (0.7 * checklistRate) + (0.3 * mockRating);

    return [
        { factor: FACTOR_NAMES[0], weight: WEIGHTS.skills, value: clamp01(skillProgress), note: '' },
        {
            factor: FACTOR_NAMES[1],
            weight: WEIGHTS.discipline,
            value: clamp01(discipline),
            note: dueCount === 0 ? 'No deadlines have passed yet.' : '',
        },
        {
            factor: FACTOR_NAMES[2],
            weight: WEIGHTS.roleMatch,
            value: clamp01(roleMatch),
            note: requiredSkills.length === 0 ? 'Choose a target role to see your role match.' : '',
        },
        {
            factor: FACTOR_NAMES[3],
            weight: WEIGHTS.academics,
            value: clamp01(academics),
            note: cgpa === null ? 'Add your CGPA to your profile.' : '',
        },
        { factor: FACTOR_NAMES[4], weight: WEIGHTS.interview, value: clamp01(interview), note: '' },
    ];
};

const rawScore = (inputs) => getFactorValues(inputs)
    .reduce((sum, factor) => sum + factor.weight * factor.value, 0);

export const computeReadiness = (inputs) => {
    const factors = getFactorValues(inputs);
    const score = Math.min(100, Math.max(0, Math.round(
        factors.reduce((sum, factor) => sum + factor.weight * factor.value, 0)
    )));
    const breakdown = factors.map(({ factor, weight, value, note }) => ({
        factor,
        weight,
        value: Math.round(value * 100),
        contribution: Math.round((weight * value + Number.EPSILON) * 10) / 10,
        note,
    }));
    return { score, breakdown };
};

export const computeWhatIf = (inputs, roadmapId) => {
    const current = computeReadiness(inputs);
    const roadmaps = Array.isArray(inputs?.roadmaps) ? inputs.roadmaps : [];
    const projectedRoadmaps = roadmaps.map((roadmap) => (
        String(roadmap.id) === String(roadmapId)
            ? { ...roadmap, completedDays: roadmap.totalDays }
            : { ...roadmap }
    ));
    const projected = computeReadiness({ ...inputs, roadmaps: projectedRoadmaps });
    return { current, projected, delta: projected.score - current.score };
};

const cloneInputs = (inputs) => ({
    ...inputs,
    user: { ...(inputs?.user ?? {}) },
    roadmaps: (Array.isArray(inputs?.roadmaps) ? inputs.roadmaps : []).map((roadmap) => ({
        ...roadmap,
        skills: Array.isArray(roadmap.skills) ? [...roadmap.skills] : [],
        verifiedSkills: Array.isArray(roadmap.verifiedSkills) ? [...roadmap.verifiedSkills] : [],
    })),
    tasks: (Array.isArray(inputs?.tasks) ? inputs.tasks : []).map((task) => ({ ...task })),
    checklist: {
        ...(inputs?.checklist ?? {}),
        nextUnticked: inputs?.checklist?.nextUnticked
            ? { ...inputs.checklist.nextUnticked }
            : null,
    },
});

export const nextBestAction = (inputs = {}) => {
    const currentScore = rawScore(inputs);
    const candidates = [];
    const roadmaps = Array.isArray(inputs.roadmaps) ? inputs.roadmaps : [];

    roadmaps.forEach((roadmap, index) => {
        const completedDays = Math.max(0, numeric(roadmap.completedDays));
        const totalDays = Math.max(0, numeric(roadmap.totalDays));
        if (roadmap.status !== 'active' || completedDays >= totalDays) return;
        const candidate = cloneInputs(inputs);
        candidate.roadmaps[index].completedDays = completedDays + 1;
        const gain = Math.round(rawScore(candidate) - currentScore);
        if (gain >= 1) {
            candidates.push({
                text: `Complete the next day of your ${roadmap.goal || 'learning'} roadmap to gain +${gain} points.`,
                gain,
                kind: 'roadmap_day',
            });
        }
    });

    if (inputs.checklist?.nextUnticked !== null && inputs.checklist?.nextUnticked !== undefined) {
        const candidate = cloneInputs(inputs);
        candidate.checklist.tickedItems = Math.max(0, numeric(candidate.checklist.tickedItems)) + 1;
        const gain = Math.round(rawScore(candidate) - currentScore);
        if (gain >= 1) {
            candidates.push({
                text: `Tick "${inputs.checklist.nextUnticked.label}" in your interview checklist to gain +${gain} points.`,
                gain,
                kind: 'checklist',
            });
        }
    }

    const targetSkills = getRoleSkills(inputs.user?.targetRole);
    roadmaps.forEach((roadmap, index) => {
        if (roadmap.status !== 'completed') return;
        const coveredSkills = normalizedSet(roadmap.skills);
        const verifiedSkills = normalizedSet(roadmap.verifiedSkills);
        const missingSkills = targetSkills.filter((skill) => (
            coveredSkills.has(skill) && !verifiedSkills.has(skill)
        ));
        if (missingSkills.length === 0) return;

        const candidate = cloneInputs(inputs);
        candidate.roadmaps[index].verifiedSkills = [
            ...new Set([...(candidate.roadmaps[index].verifiedSkills ?? []), ...missingSkills]),
        ];
        const gain = Math.round(rawScore(candidate) - currentScore);
        if (gain >= 1) {
            candidates.push({
                text: `Pass the final quiz for ${roadmap.goal || 'your roadmap'} to verify ${missingSkills.join(', ')} to gain +${gain} points.`,
                gain,
                kind: 'verify',
            });
        }
    });

    if (inputs.checklist?.mockRating === null || inputs.checklist?.mockRating === undefined) {
        const candidate = cloneInputs(inputs);
        candidate.checklist.mockRating = 4;
        const gain = Math.round(rawScore(candidate) - currentScore);
        if (gain >= 1) {
            candidates.push({
                text: `Record a mock interview with a mentor to gain +${gain} points.`,
                gain,
                kind: 'mock',
            });
        }
    }

    return candidates.reduce((best, candidate) => (
        !best || candidate.gain > best.gain ? candidate : best
    ), null);
};
