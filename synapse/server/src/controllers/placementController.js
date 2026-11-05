import User from '../models/User.js';
import { analyzeResume } from '../services/resumeService.js';
import { extractText } from '../services/ragService.js';
import { buildRoadmapPreview } from '../services/roadmapService.js';
import { startOfISTDay } from '../utils/dateHelpers.js';
import {
    addMockSession,
    getChecklistForUser,
    getHistory,
    getReadiness,
    getWhatIf,
    toggleChecklistItem,
} from '../services/placementService.js';
import {
    checklistBodySchema,
    checklistParamsSchema,
    mockBodySchema,
    mockParamsSchema,
    roadmapIdParamsSchema,
    resumeGapBodySchema,
    toRoadmapBodySchema,
} from '../validators/placementValidators.js';

const validationErrors = (issues) => {
    const errors = {};
    issues.forEach((issue) => {
        const path = issue.path.join('.');
        const field = issue.code === 'unrecognized_keys'
            ? [path, issue.keys.join(', ')].filter(Boolean).join('.')
            : path || 'general';
        errors[field] = issue.message;
    });
    return errors;
};

const respondWithValidationErrors = (res, issues) => res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: validationErrors(issues),
});

const handleError = (error, res, next) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }
    return next(error);
};

export const getReadinessHandler = async (req, res, next) => {
    try {
        const readiness = await getReadiness(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Readiness retrieved successfully',
            readiness,
        });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getWhatIfHandler = async (req, res, next) => {
    try {
        const parsed = roadmapIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const whatIf = await getWhatIf(req.user.id, parsed.data.roadmapId);
        res.status(200).json({
            success: true,
            message: 'Readiness projection retrieved successfully',
            whatIf,
        });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getHistoryHandler = async (req, res, next) => {
    try {
        const history = await getHistory(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Readiness history retrieved successfully',
            history,
        });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getChecklistHandler = async (req, res, next) => {
    try {
        const checklist = await getChecklistForUser(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Interview checklist retrieved successfully',
            checklist,
        });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const toggleChecklistHandler = async (req, res, next) => {
    try {
        const params = checklistParamsSchema.safeParse(req.params);
        if (!params.success) return respondWithValidationErrors(res, params.error.errors);
        const body = checklistBodySchema.safeParse(req.body);
        if (!body.success) return respondWithValidationErrors(res, body.error.errors);

        const checklist = await toggleChecklistItem(
            req.user.id,
            params.data.key,
            body.data.ticked
        );
        res.status(200).json({
            success: true,
            message: 'Interview checklist updated successfully',
            checklist,
        });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const addMockHandler = async (req, res, next) => {
    try {
        const params = mockParamsSchema.safeParse(req.params);
        if (!params.success) return respondWithValidationErrors(res, params.error.errors);
        const body = mockBodySchema.safeParse(req.body);
        if (!body.success) return respondWithValidationErrors(res, body.error.errors);

        const checklist = await addMockSession(
            params.data.studentId,
            { _id: req.user.id, role: req.userRole },
            body.data
        );
        res.status(201).json({
            success: true,
            message: 'Mock interview recorded successfully',
            checklist,
        });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const resumeGap = async (req, res, next) => {
    try {
        const parsed = resumeGapBodySchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        let resumeText = parsed.data.resumeText || '';
        if (req.file) {
            const pages = await extractText(req.file.buffer, req.file.mimetype);
            resumeText = pages.map(({ text }) => text).join('\n').trim();
        }
        if (resumeText.length < 80) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: { resume: 'Upload a PDF or TXT, or paste your resume text.' },
            });
        }

        const analysis = await analyzeResume({
            resumeText,
            jobDescription: parsed.data.jobDescription,
        });
        res.status(200).json({
            success: true,
            message: 'Resume analyzed successfully',
            ...analysis,
        });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const resumeToRoadmap = async (req, res, next) => {
    try {
        const parsed = toRoadmapBodySchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const user = await User.findById(req.user.id)
            .select('dailyHours skills careerGoal targetRole')
            .lean();
        if (!user) {
            return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
        }

        const hoursPerDay = typeof user.dailyHours === 'number'
            ? Math.min(8, Math.max(0.5, user.dailyHours))
            : 2;
        const { roadmap, certificationAlternatives } = await buildRoadmapPreview({
            goal: `Learn ${parsed.data.missingSkills.join(', ')}`.slice(0, 200),
            currentLevel: 'beginner',
            hoursPerDay,
            durationDays: 14,
            preferredResources: ['docs', 'youtube'],
            pathType: 'free_learning',
            startDate: startOfISTDay(),
        }, user);

        res.status(200).json({
            success: true,
            message: 'Roadmap generated successfully. Review it before saving.',
            roadmap,
            certificationAlternatives,
        });
    } catch (error) {
        handleError(error, res, next);
    }
};
