import { z } from 'zod';

export const announcementSourceTypeSchema = z.enum([
    'official_circular',
    'mentor_message',
    'forwarded_message',
    'other',
]);

export const announcementTaskSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    deadline: z.coerce.date().nullable(),
    category: z.enum(['assessment', 'assignment', 'placement', 'event', 'personal']),
    priority: z.enum(['low', 'medium', 'high']),
    actionRequired: z.boolean(),
    estimatedHours: z.number().min(0).max(100),
}).strict();

const confirmAnnouncementTaskSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional().default(''),
    deadline: z.preprocess(
        (value) => value === '' ? null : value,
        z.coerce.date().nullable()
    ).optional().default(null),
    category: z.enum(['assessment', 'assignment', 'placement', 'event', 'personal']).optional().default('personal'),
    priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    actionRequired: z.boolean().optional().default(true),
    estimatedHours: z.number().min(0).max(100).optional().default(1),
});

export const extractAnnouncementSchema = z.object({
    rawText: z.string().trim().min(1).max(20000),
    sourceType: announcementSourceTypeSchema.optional().default('other'),
}).strict();

export const confirmAnnouncementSchema = z.object({
    tasks: z.array(confirmAnnouncementTaskSchema).max(15),
}).strict();

export const announcementIdParamsSchema = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Announcement ID must be a valid ObjectId'),
});

export const extractedTasksResponseSchema = z.object({
    tasks: z.array(z.unknown()),
}).strict();
