import { z } from 'zod';

export const createDocumentSchema = z.object({
    title: z.string().trim().min(1).max(200),
    category: z.enum(['syllabus', 'rules', 'placement', 'exam', 'other']).optional().default('other'),
    accessLevel: z.enum(['all', 'mentor_only']).optional().default('all'),
}).strict();

export const documentIdParamsSchema = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Document ID must be a valid ObjectId'),
});
