import User from '../models/User.js';
import { answerQuestion } from '../services/assistantService.js';
import { askAssistantSchema } from '../validators/assistantValidators.js';

const validationErrors = (issues) => {
    const errors = {};
    issues.forEach((issue) => {
        const field = issue.code === 'unrecognized_keys'
            ? [issue.path.join('.'), issue.keys.join(', ')].filter(Boolean).join('.')
            : issue.path.join('.') || 'general';
        errors[field] = issue.message;
    });
    return errors;
};

export const askAssistant = async (req, res, next) => {
    try {
        const parsed = askAssistantSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors(parsed.error.errors),
            });
        }

        const user = await User.findById(req.user.id).select('role department year cgpa backlogs').lean();
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in.',
            });
        }

        const result = await answerQuestion({
            ...parsed.data,
            user,
        });
        res.status(200).json({
            success: true,
            message: 'Answer generated successfully.',
            ...result,
        });
    } catch (err) {
        next(err);
    }
};
