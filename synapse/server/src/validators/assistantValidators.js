import { z } from 'zod';

export const askAssistantSchema = z.object({
    question: z.string().trim().min(1).max(500),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
    }).strict()).max(6).optional().default([]),
}).strict();
