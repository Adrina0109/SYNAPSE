import { z } from 'zod';

const objectIdSchema = z.string()
    .regex(/^[a-f\d]{24}$/i, 'Must be a valid ObjectId')
    .transform((id) => id.toLowerCase());

const assignmentSchema = z.object({
    studentIds: z.array(objectIdSchema).min(1).max(100)
        .refine((studentIds) => new Set(studentIds.map((id) => id.toLowerCase())).size === studentIds.length, 'Student IDs must be unique'),
    mentorId: objectIdSchema,
}).strict();

export const assignMentorSchema = assignmentSchema;
export const unassignMentorSchema = assignmentSchema;

export const adminUsersQuerySchema = z.object({
    role: z.enum(['student', 'mentor']),
    unassigned: z.enum(['true', 'false']).optional(),
}).strict();

export const adminIdParamsSchema = z.object({
    id: objectIdSchema,
});
