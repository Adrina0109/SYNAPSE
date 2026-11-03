import { z } from 'zod';

const taskCategorySchema = z.enum(['assessment', 'assignment', 'placement', 'event', 'personal']);
const taskPrioritySchema = z.enum(['low', 'medium', 'high']);
const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const createTaskSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    category: taskCategorySchema.optional(),
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema.optional(),
    deadline: z.coerce.date().nullable().optional(),
    estimatedHours: z.number().min(0).max(100).optional(),
}).strict();

export const updateTaskSchema = createTaskSchema.partial();

export const taskQuerySchema = z.object({
    status: taskStatusSchema.optional(),
    category: taskCategorySchema.optional(),
});
