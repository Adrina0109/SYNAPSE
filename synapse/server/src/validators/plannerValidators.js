import { z } from 'zod';

export const capacityQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(60).default(14),
}).strict();

export const applyReplanSchema = z.object({
    fingerprint: z.string().regex(/^[a-f0-9]{16}$/),
}).strict();
