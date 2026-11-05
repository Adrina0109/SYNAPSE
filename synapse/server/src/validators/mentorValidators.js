import { z } from 'zod';

export const studentIdParamsSchema = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Student ID must be a valid ObjectId'),
});

export const mentorBroadcastSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    deadline: z.coerce.date().nullable().optional(),
    category: z.enum(['assessment', 'assignment', 'placement', 'event', 'personal']).optional(),
    estimatedHours: z.number().min(0).max(100).optional(),
}).strict();
