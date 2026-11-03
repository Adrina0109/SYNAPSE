import { z } from 'zod';

// List of weak passwords to reject
const COMMON_PASSWORDS = [
    'Password1!', 'Password123!', 'Password123', 'Passw0rd!',
    'Admin123!', 'Welcome1!', 'Qwerty123!',
];

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .refine(
        (val) => !COMMON_PASSWORDS.includes(val),
        'This password is too common. Please choose a stronger one.'
    );

export const signupSchema = z
    .object({
        name: z
            .string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name cannot exceed 100 characters')
            .trim(),
        email: z
            .string()
            .email('Please enter a valid email address')
            .toLowerCase()
            .trim(),
        password: passwordSchema,
        confirmPassword: z.string(),
        role: z.enum(['student', 'mentor', 'admin'], {
            errorMap: () => ({ message: 'Role must be student, mentor, or admin' }),
        }),
        inviteCode: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export const loginSchema = z.object({
    email: z
        .string()
        .email('Please enter a valid email address')
        .toLowerCase()
        .trim(),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
});

export const profileSchema = z.object({
    department: z
        .string()
        .min(1, 'Department is required')
        .max(100)
        .optional(),
    year: z
        .number()
        .int()
        .min(1, 'Year must be between 1 and 5')
        .max(5, 'Year must be between 1 and 5')
        .optional(),
    skills: z
        .array(z.string().min(1).max(50))
        .max(20, 'You can add up to 20 skills')
        .optional(),
    careerGoal: z.string().max(200).optional(),
    dailyHours: z
        .number()
        .int()
        .min(1, 'Minimum 1 hour per day')
        .max(8, 'Maximum 8 hours per day')
        .optional(),
    cgpa: z
        .number()
        .min(0)
        .max(10)
        .optional(),
    backlogs: z
        .number()
        .int()
        .min(0)
        .optional(),
    targetRole: z.string().max(100).optional(),
    weeklyClassHours: z
        .number()
        .min(0)
        .max(60)
        .optional(),
}).strict();
