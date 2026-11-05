import {
    applyReplan,
    detectConflicts,
    getDailyCapacity,
    previewReplan,
} from '../services/capacityService.js';
import { addDays, istDayKey, startOfISTDay } from '../utils/dateHelpers.js';
import {
    applyReplanSchema,
    capacityQuerySchema,
} from '../validators/plannerValidators.js';

const validationErrors = (issues) => {
    const errors = {};
    issues.forEach((issue) => {
        const field = issue.path[0] ?? (issue.code === 'unrecognized_keys' ? issue.keys.join(', ') : 'general');
        errors[field] = issue.message;
    });
    return errors;
};

const respondWithValidationErrors = (res, issues) => res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: validationErrors(issues),
});

export const getCapacity = async (req, res, next) => {
    try {
        const parsed = capacityQuerySchema.safeParse(req.query);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const todayDate = startOfISTDay();
        const endDate = addDays(todayDate, parsed.data.days - 1);
        const days = await getDailyCapacity(req.user.id, todayDate, endDate);
        const availableHours = days[0]?.availableHours ?? 2;
        const summary = {
            freeHoursNext7Days: Math.round(
                days.slice(0, 7).reduce((sum, day) => sum + day.freeHours, 0) * 100
            ) / 100,
            overloadedDays: days.filter((day) => day.load === 'overloaded').length,
        };

        res.status(200).json({
            success: true,
            message: 'Daily capacity retrieved successfully',
            today: istDayKey(todayDate),
            availableHours,
            days,
            summary,
        });
    } catch (err) {
        next(err);
    }
};

export const getConflicts = async (req, res, next) => {
    try {
        const conflicts = await detectConflicts(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Planner conflicts retrieved successfully',
            conflicts,
        });
    } catch (err) {
        next(err);
    }
};

export const previewReplanHandler = async (req, res, next) => {
    try {
        const plan = await previewReplan(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Re-plan preview generated successfully',
            plan,
        });
    } catch (err) {
        next(err);
    }
};

export const applyReplanHandler = async (req, res, next) => {
    try {
        const parsed = applyReplanSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const result = await applyReplan(req.user.id, parsed.data.fingerprint);
        res.status(200).json({
            success: true,
            message: result.applied
                ? 'Re-plan applied successfully'
                : 'No re-planning changes were needed',
            result,
        });
    } catch (err) {
        next(err);
    }
};
