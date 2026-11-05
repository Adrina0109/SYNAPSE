import InterviewChecklist from '../models/InterviewChecklist.js';
import ReadinessSnapshot from '../models/ReadinessSnapshot.js';
import Roadmap from '../models/Roadmap.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import {
    getChecklistItems,
    isValidItemKey,
} from '../data/interviewChecklist.js';
import { findSkillsInText, normalizeSkill } from '../data/skillCatalog.js';
import {
    computeReadiness,
    computeWhatIf,
    nextBestAction,
} from './readinessCore.js';
import { addDaysToKey, istDayKey } from '../utils/dateHelpers.js';

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const toId = (value) => String(value?._id ?? value?.id ?? value ?? '');

export const weekKeyFor = (date = new Date()) => {
    const key = istDayKey(date);
    const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
    return addDaysToKey(key, -((weekday + 6) % 7));
};

export const loadInputs = async (userId, now = new Date()) => {
    const [user, roadmaps, tasks, checklist] = await Promise.all([
        User.findOne({ _id: userId })
            .select('cgpa backlogs targetRole skills department')
            .lean(),
        Roadmap.find({
            user: userId,
            status: { $in: ['active', 'paused', 'completed'] },
        }).lean(),
        Task.find({ user: userId })
            .select('status deadline completedAt')
            .lean(),
        InterviewChecklist.findOne({ user: userId }).lean(),
    ]);

    if (!user) throw createError(404, 'Student not found.');

    const items = getChecklistItems(user.targetRole);
    const validKeys = new Set(items.map((item) => item.key));
    const tickedKeys = new Set(
        (checklist?.ticks ?? [])
            .map((tick) => tick.key)
            .filter((key) => validKeys.has(key))
    );
    const latestMockSession = [...(checklist?.mockSessions ?? [])]
        .sort((sessionA, sessionB) => (
            new Date(sessionB.date).getTime() - new Date(sessionA.date).getTime()
        ))[0];

    return {
        now,
        user: {
            cgpa: user.cgpa ?? null,
            backlogs: user.backlogs ?? null,
            targetRole: user.targetRole ?? null,
            declaredSkills: [...new Set((user.skills ?? []).map(normalizeSkill).filter(Boolean))],
        },
        roadmaps: roadmaps.map((roadmap) => ({
            id: toId(roadmap),
            goal: roadmap.goal,
            status: roadmap.status,
            completedDays: (roadmap.days ?? []).filter((day) => day.completed).length,
            totalDays: (roadmap.days ?? []).length,
            skills: findSkillsInText(roadmap.goal),
            // TODO: wire to the Phase 4B final quiz result
            verifiedSkills: [],
        })),
        tasks: tasks.map((task) => ({
            deadline: task.deadline ?? null,
            completedAt: task.completedAt ?? null,
            status: task.status,
        })),
        checklist: {
            totalItems: items.length,
            tickedItems: tickedKeys.size,
            nextUnticked: items.find((item) => !tickedKeys.has(item.key)) ?? null,
            mockRating: latestMockSession?.rating ?? null,
        },
    };
};

export const ensureWeeklySnapshot = async (userId, result, now = new Date()) => {
    try {
        await ReadinessSnapshot.updateOne(
            { user: userId, weekKey: weekKeyFor(now) },
            {
                $setOnInsert: {
                    score: result.score,
                    breakdown: result.breakdown.map(({ factor, value, contribution }) => ({
                        factor,
                        value,
                        contribution,
                    })),
                    createdAt: now,
                },
            },
            { upsert: true }
        );
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
};

export const getReadiness = async (userId, now = new Date()) => {
    const inputs = await loadInputs(userId, now);
    const result = computeReadiness(inputs);
    await ensureWeeklySnapshot(userId, result, now);
    return {
        ...result,
        nextBestAction: nextBestAction(inputs),
        weekKey: weekKeyFor(now),
    };
};

export const getHistory = async (userId, now = new Date()) => {
    const current = await getReadiness(userId, now);
    const snapshots = await ReadinessSnapshot.find({ user: userId })
        .sort({ weekKey: 1 })
        .select('weekKey score')
        .lean();
    const first = snapshots[0];

    return {
        snapshots: snapshots.map(({ weekKey, score }) => ({ weekKey, score })),
        currentScore: current.score,
        changeSinceFirst: snapshots.length < 2 ? null : current.score - first.score,
        sinceLabel: first
            ? new Date(`${first.weekKey}T00:00:00Z`).toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
            })
            : null,
    };
};

export const getWhatIf = async (userId, roadmapId) => {
    const inputs = await loadInputs(userId);
    const roadmap = inputs.roadmaps.find((item) => item.id === toId(roadmapId));
    if (!roadmap) throw createError(404, 'Roadmap not found.');
    return computeWhatIf(inputs, roadmapId);
};

const getStudentRole = async (userId) => {
    const user = await User.findOne({ _id: userId })
        .select('targetRole')
        .lean();
    if (!user) throw createError(404, 'Student not found.');
    return user.targetRole;
};

export const toggleChecklistItem = async (userId, key, ticked) => {
    const role = await getStudentRole(userId);
    if (!isValidItemKey(key) || !getChecklistItems(role).some((item) => item.key === key)) {
        throw createError(400, 'That checklist item does not apply to your target role.');
    }

    if (!ticked) {
        return InterviewChecklist.findOneAndUpdate(
            { user: userId },
            { $pull: { ticks: { key } } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();
    }

    try {
        const checklist = await InterviewChecklist.findOneAndUpdate(
            { user: userId, 'ticks.key': { $ne: key } },
            { $push: { ticks: { key } } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();
        if (checklist) return checklist;
    } catch (error) {
        if (error.code !== 11000) throw error;
    }

    return InterviewChecklist.findOne({ user: userId }).lean();
};

export const getChecklistForUser = async (userId) => {
    const role = await getStudentRole(userId);
    const checklist = await InterviewChecklist.findOne({ user: userId }).lean();
    const tickedKeys = new Set((checklist?.ticks ?? []).map((tick) => tick.key));
    return {
        items: getChecklistItems(role).map((item) => ({
            ...item,
            ticked: tickedKeys.has(item.key),
        })),
        mockSessions: [...(checklist?.mockSessions ?? [])].sort((sessionA, sessionB) => (
            new Date(sessionB.date).getTime() - new Date(sessionA.date).getTime()
        )),
    };
};

export const addMockSession = async (studentId, mentor, { date, rating, notes }) => {
    const student = await User.findOne({ _id: studentId, role: 'student' })
        .select('mentors')
        .lean();
    if (!student) throw createError(404, 'Student not found.');

    if (mentor?.role === 'mentor') {
        const assigned = (student.mentors ?? []).some((mentorId) => (
            toId(mentorId) === toId(mentor._id)
        ));
        if (!assigned) {
            throw createError(403, 'You can only record mock interviews for your assigned students.');
        }
    } else if (mentor?.role !== 'admin') {
        throw createError(403, 'You can only record mock interviews for your assigned students.');
    }

    return InterviewChecklist.findOneAndUpdate(
        { user: studentId },
        {
            $push: {
                mockSessions: {
                    date,
                    rating,
                    notes,
                    mentor: mentor._id,
                },
            },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();
};
