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
