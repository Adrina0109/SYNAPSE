import { z } from 'zod';

// Password rules (mirrors server)
const COMMON_PASSWORDS = [
    'Password1!', 'Password123!', 'Password123', 'Passw0rd!',
    'Admin123!', 'Welcome1!', 'Qwerty123!',
];

export const passwordSchema = z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'One uppercase letter')
    .regex(/[a-z]/, 'One lowercase letter')
    .regex(/[0-9]/, 'One number')
    .regex(/[^A-Za-z0-9]/, 'One special character')
    .refine(
        (val) => !COMMON_PASSWORDS.includes(val),
        'Password is too common'
    );

export const signupSchema = z
    .object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
        email: z.string().email('Enter a valid email address').toLowerCase().trim(),
        password: passwordSchema,
        confirmPassword: z.string(),
        role: z.enum(['student', 'mentor', 'admin'], {
            errorMap: () => ({ message: 'Select a role' }),
        }),
        inviteCode: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export const loginSchema = z.object({
    email: z.string().email('Enter a valid email address').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
});

export const profileSchema = z.object({
    department: z.string().min(1, 'Department is required').max(100),
    year: z.number().int().min(1).max(5),
    skills: z.array(z.string().min(1)).min(1, 'Add at least one skill').max(20),
    careerGoal: z.string().min(1, 'Select a career goal').max(200),
    dailyHours: z.number().int().min(1).max(8),
});

// Password strength checker — returns rules status
export const checkPasswordStrength = (password) => {
    const rules = [
        { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
        { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
        { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
        { id: 'number', label: 'One number', met: /[0-9]/.test(password) },
        { id: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = rules.filter((r) => r.met).length;
    return { rules, score, total: rules.length };
};
