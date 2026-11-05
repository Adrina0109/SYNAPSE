import { z } from 'zod';

export const RESOURCE_TYPES = ['youtube', 'docs', 'course', 'book'];
export const PREFERRED_RESOURCE_TYPES = [...RESOURCE_TYPES, 'notes'];

const resourceTypeSchema = z.enum(RESOURCE_TYPES);
const preferredResourceTypeSchema = z.enum(PREFERRED_RESOURCE_TYPES);

const generateRoadmapBaseSchema = z.object({
    goal: z.string().trim().min(2).max(200),
    currentLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    hoursPerDay: z.number().min(0.5).max(8),
    durationDays: z.number().int().min(3).max(60),
    preferredResources: z.array(preferredResourceTypeSchema)
        .min(1)
        .max(5)
        .refine((resources) => new Set(resources).size === resources.length, {
            message: 'Preferred resources must not contain duplicates.',
        }),
    pathType: z.enum(['free_learning', 'free_certificate', 'any_certificate']).default('free_learning'),
    targetCertification: z.preprocess(
        (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
        z.string().trim().max(150).optional()
    ),
    startDate: z.coerce.date().optional(),
}).strict();

export const generateRoadmapSchema = generateRoadmapBaseSchema.refine(
    (roadmap) => roadmap.pathType !== 'free_learning' || roadmap.targetCertification === undefined,
    {
        message: 'Choose a certificate path to use a target certification.',
        path: ['targetCertification'],
    }
);

export const isAllowedResourceUrl = (url) => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

const savedResourceSchema = z.object({
    title: z.string().trim().min(1).max(150),
    url: z.string().refine(isAllowedResourceUrl, {
        message: 'Resource URL must be a valid HTTPS URL.',
    }),
    type: resourceTypeSchema,
}).strict();

export const savedDaySchema = z.object({
    dayNumber: z.number().int().min(1).max(60),
    topic: z.string().trim().min(1).max(200),
    description: z.string().max(800).optional().default(''),
    practiceTask: z.string().max(500).optional().default(''),
    estimatedHours: z.number().min(0).max(8),
    resources: z.array(savedResourceSchema).max(5),
    date: z.coerce.date().optional(),
    completed: z.boolean().optional(),
    completedAt: z.coerce.date().nullable().optional(),
    notes: z.null().optional(),
}).strict();

export const saveRoadmapSchema = generateRoadmapBaseSchema.extend({
    days: z.array(savedDaySchema).min(3).max(60),
    certification: z.object({
        status: z.enum(['none', 'matched', 'not_found', 'unverified']),
        catalogId: z.string().max(100).optional(),
    }),
}).strict()
    .refine(
        (roadmap) => roadmap.pathType !== 'free_learning' || roadmap.targetCertification === undefined,
        {
            message: 'Choose a certificate path to use a target certification.',
            path: ['targetCertification'],
        }
    )
    .refine(
        (roadmap) => roadmap.days.length === roadmap.durationDays
            && roadmap.days.every((day, index) => day.dayNumber === index + 1),
        {
            message: 'Days must match durationDays and be numbered sequentially from 1.',
            path: ['days'],
        }
    );

export const noteBodySchema = z.object({
    regenerate: z.boolean().optional(),
}).strict();

export const roadmapIdParamsSchema = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Roadmap ID must be a valid ObjectId'),
}).strict();

export const dayToggleParamsSchema = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Roadmap ID must be a valid ObjectId'),
    dayNumber: z.coerce.number().int().min(1).max(60),
}).strict();
