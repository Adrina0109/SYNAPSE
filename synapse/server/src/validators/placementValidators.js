import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID must be a valid ObjectId');

export const roadmapIdParamsSchema = z.object({
    roadmapId: objectIdSchema,
}).strict();

export const checklistParamsSchema = z.object({
    key: z.string().min(3).max(60),
}).strict();

export const checklistBodySchema = z.object({
    ticked: z.boolean(),
}).strict();

export const mockParamsSchema = z.object({
    studentId: objectIdSchema,
}).strict();

export const mockBodySchema = z.object({
    date: z.coerce.date().refine(
        (date) => date.getTime() <= Date.now() + (24 * 60 * 60 * 1000),
        { message: 'Date cannot be more than one day in the future.' }
    ),
    rating: z.number().int().min(1).max(5),
    notes: z.string().trim().max(500).optional().default(''),
}).strict();

export const resumeGapBodySchema = z.object({
    jobDescription: z.string().trim().min(80).max(8000),
    resumeText: z.string().trim().max(20000).optional(),
}).strict();

export const toRoadmapBodySchema = z.object({
    missingSkills: z.array(z.string().trim().max(60)).min(1).max(8),
}).strict();
