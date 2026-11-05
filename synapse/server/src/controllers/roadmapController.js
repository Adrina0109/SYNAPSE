import Roadmap from '../models/Roadmap.js';
import User from '../models/User.js';
import { getCatalogEntry } from '../data/certificationCatalog.js';
import { certificationMessage } from '../services/certificationService.js';
import {
    buildRoadmapPreview,
    generateDayNotes as generateDayNotesService,
} from '../services/roadmapService.js';
import { addDays, startOfISTDay } from '../utils/dateHelpers.js';
import { serializeRoadmap } from '../utils/roadmapHelpers.js';
import {
    dayToggleParamsSchema,
    generateRoadmapSchema,
    noteBodySchema,
    roadmapIdParamsSchema,
    saveRoadmapSchema,
} from '../validators/roadmapValidators.js';

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

const certificationFromCatalogEntry = (entry) => ({
    status: 'matched',
    catalogId: entry.id,
    name: entry.name,
    provider: entry.provider,
    costType: entry.costType,
    costNote: entry.costNote,
    url: entry.url,
    lastVerified: entry.lastVerified,
    message: '',
});

const resolveSubmittedCertification = (input, res) => {
    const { status, catalogId } = input.certification;
    if (status === 'matched') {
        const entry = getCatalogEntry(catalogId);
        if (!entry) {
            res.status(400).json({
                success: false,
                message: 'Unknown certification catalog entry.',
                errors: { 'certification.catalogId': 'Choose a certification from the verified catalog.' },
            });
            return null;
        }
        if (input.pathType === 'free_learning') {
            res.status(400).json({
                success: false,
                message: 'A matched certification cannot be saved for a free learning plan.',
                errors: { certification: 'Choose a certificate path to save a matched certification.' },
            });
            return null;
        }
        if (input.pathType === 'free_certificate' && entry.costType !== 'free') {
            res.status(400).json({
                success: false,
                message: 'This certification does not have a verified free certificate.',
                errors: { 'certification.catalogId': 'Choose an entry with a free certificate.' },
            });
            return null;
        }
        return certificationFromCatalogEntry(entry);
    }

    if (status === 'none') {
        if (input.pathType !== 'free_learning') {
            res.status(400).json({
                success: false,
                message: 'No certification is valid only for a free learning plan.',
                errors: { certification: 'Choose a certification status for this certificate path.' },
            });
            return null;
        }
        return { status: 'none' };
    }

    if (input.pathType === 'free_learning') {
        res.status(400).json({
            success: false,
            message: 'A certification status is not valid for a free learning plan.',
            errors: { certification: 'Use status none for a free learning plan.' },
        });
        return null;
    }

    return {
        status,
        message: status === 'unverified'
            ? certificationMessage(status, input.targetCertification || '')
            : certificationMessage(status),
    };
};

const validateDayResourceHosts = (days, certification, res) => {
    for (const [dayIndex, day] of days.entries()) {
        for (const [resourceIndex, resource] of day.resources.entries()) {
            const allowedHost = ['www.youtube.com', 'www.google.com']
                .includes(new URL(resource.url).hostname);
            if (!allowedHost && resource.url !== certification?.url) {
                res.status(400).json({
                    success: false,
                    message: 'Resource URLs must use www.youtube.com, www.google.com, or the verified certification page.',
                    errors: {
                        [`days.${dayIndex}.resources.${resourceIndex}.url`]: 'This resource host is not allowed.',
                    },
                });
                return false;
            }
        }
    }
    return true;
};

export const generateRoadmap = async (req, res, next) => {
    try {
        const parsed = generateRoadmapSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const user = await User.findById(req.user.id)
            .select('skills careerGoal targetRole')
            .lean();
        if (!user) {
            return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
        }

        const { roadmap, certificationAlternatives } = await buildRoadmapPreview(parsed.data, user);

        res.status(200).json({
            success: true,
            message: 'Roadmap generated successfully. Review it before saving.',
            roadmap,
            certificationAlternatives,
        });
    } catch (err) {
        next(err);
    }
};

export const saveRoadmap = async (req, res, next) => {
    try {
        const parsed = saveRoadmapSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const certification = resolveSubmittedCertification(parsed.data, res);
        if (!certification) return;
        if (!validateDayResourceHosts(parsed.data.days, certification, res)) return;

        const unfinishedCount = await Roadmap.countDocuments({
            user: req.user.id,
            status: { $ne: 'completed' },
        });
        if (unfinishedCount >= 5) {
            return res.status(409).json({
                success: false,
                message: 'You can have at most 5 unfinished roadmaps. Finish or delete one first.',
            });
        }

        const startDate = startOfISTDay(parsed.data.startDate || new Date());
        const roadmap = await Roadmap.create({
            user: req.user.id,
            goal: parsed.data.goal,
            currentLevel: parsed.data.currentLevel,
            hoursPerDay: parsed.data.hoursPerDay,
            durationDays: parsed.data.durationDays,
            preferredResources: parsed.data.preferredResources,
            pathType: parsed.data.pathType,
            targetCertification: parsed.data.targetCertification || '',
            certification,
            status: 'active',
            startDate,
            days: parsed.data.days.map((day) => ({
                dayNumber: day.dayNumber,
                date: addDays(startDate, day.dayNumber - 1),
                topic: day.topic,
                description: day.description,
                practiceTask: day.practiceTask,
                estimatedHours: day.estimatedHours,
                resources: day.resources,
                notes: null,
                completed: false,
                completedAt: null,
            })),
        });

        res.status(201).json({
            success: true,
            message: 'Roadmap saved successfully',
            roadmap: serializeRoadmap(roadmap, { includeDays: true }),
        });
    } catch (err) {
        next(err);
    }
};

export const getRoadmaps = async (req, res, next) => {
    try {
        const roadmaps = await Roadmap.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Roadmaps retrieved successfully',
            roadmaps: roadmaps.map((roadmap) => serializeRoadmap(roadmap, { includeDays: false })),
        });
    } catch (err) {
        next(err);
    }
};

export const getRoadmap = async (req, res, next) => {
    try {
        const parsed = roadmapIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const roadmap = await Roadmap.findOne({ _id: parsed.data.id, user: req.user.id });
        if (!roadmap) {
            return res.status(404).json({ success: false, message: 'Roadmap not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Roadmap retrieved successfully',
            roadmap: serializeRoadmap(roadmap, { includeDays: true }),
        });
    } catch (err) {
        next(err);
    }
};

export const toggleRoadmapDay = async (req, res, next) => {
    try {
        const parsed = dayToggleParamsSchema.safeParse(req.params);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const roadmap = await Roadmap.findOne({
            _id: parsed.data.id,
            user: req.user.id,
        });
        if (!roadmap) {
            return res.status(404).json({ success: false, message: 'Roadmap not found.' });
        }

        const day = roadmap.days.find((item) => item.dayNumber === parsed.data.dayNumber);
        if (!day) {
            return res.status(404).json({ success: false, message: 'Day not found.' });
        }

        day.completed = !day.completed;
        day.completedAt = day.completed ? new Date() : null;
        if (roadmap.days.every((item) => item.completed)) {
            roadmap.status = 'completed';
        } else if (roadmap.status === 'completed') {
            roadmap.status = 'active';
        }
        await roadmap.save();

        res.status(200).json({
            success: true,
            message: 'Roadmap day updated successfully',
            roadmap: serializeRoadmap(roadmap, { includeDays: true }),
        });
    } catch (err) {
        next(err);
    }
};

export const generateDayNotes = async (req, res, next) => {
    try {
        const parsedParams = dayToggleParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return respondWithValidationErrors(res, parsedParams.error.errors);
        }

        const parsedBody = noteBodySchema.safeParse(req.body ?? {});
        if (!parsedBody.success) {
            return respondWithValidationErrors(res, parsedBody.error.errors);
        }

        const roadmap = await Roadmap.findOne({
            _id: parsedParams.data.id,
            user: req.user.id,
        });
        if (!roadmap) {
            return res.status(404).json({ success: false, message: 'Roadmap not found.' });
        }

        const day = roadmap.days.find((item) => item.dayNumber === parsedParams.data.dayNumber);
        if (!day) {
            return res.status(404).json({ success: false, message: 'Day not found.' });
        }

        if (!day.notes || parsedBody.data.regenerate) {
            const notes = await generateDayNotesService({ roadmap, day });
            day.notes = { ...notes, generatedAt: new Date() };
            await roadmap.save();
        }

        res.status(200).json({
            success: true,
            message: 'Roadmap day notes retrieved successfully',
            roadmap: serializeRoadmap(roadmap, { includeDays: true }),
        });
    } catch (err) {
        next(err);
    }
};

export const deleteRoadmap = async (req, res, next) => {
    try {
        const parsed = roadmapIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const roadmap = await Roadmap.findOneAndDelete({
            _id: parsed.data.id,
            user: req.user.id,
        });
        if (!roadmap) {
            return res.status(404).json({ success: false, message: 'Roadmap not found.' });
        }

        res.status(200).json({ success: true, message: 'Roadmap deleted successfully' });
    } catch (err) {
        next(err);
    }
};
