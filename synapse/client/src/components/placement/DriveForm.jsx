import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const driveFormSchema = z.object({
    company: z.string().trim().min(2, 'Enter a company name').max(120, 'Company cannot exceed 120 characters'),
    role: z.string().trim().min(2, 'Enter a role').max(120, 'Role cannot exceed 120 characters'),
    date: z.string().min(1, 'Choose a drive date').refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
    minCgpa: z.string().refine((value) => (
        value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 10
    ), 'Minimum CGPA must be between 0 and 10'),
    maxBacklogs: z.string().refine((value) => (
        value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 20)
    ), 'Maximum backlogs must be a whole number from 0 to 20'),
    branchesText: z.string().transform((value) => value.split(',').map((branch) => branch.trim()).filter(Boolean))
        .refine((branches) => branches.length <= 10, 'Enter no more than 10 branches')
        .refine((branches) => branches.every((branch) => branch.length <= 40), 'Each branch cannot exceed 40 characters'),
    status: z.enum(['open', 'closed']),
});

const toDateInput = (date) => {
    if (!date) return '';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const EMPTY_FORM = {
    company: '',
    role: '',
    date: '',
    minCgpa: '0',
    maxBacklogs: '',
    branchesText: '',
    status: 'open',
};

export default function DriveForm({
    onSubmit,
    initialValues = null,
    isSubmitting = false,
    onCancel,
}) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(driveFormSchema),
        defaultValues: EMPTY_FORM,
        mode: 'onBlur',
    });

    useEffect(() => {
        reset(initialValues ? {
            company: initialValues.company || '',
            role: initialValues.role || '',
            date: toDateInput(initialValues.date),
            minCgpa: String(initialValues.minCgpa ?? 0),
            maxBacklogs: initialValues.maxBacklogs == null ? '' : String(initialValues.maxBacklogs),
            branchesText: (initialValues.branches || []).join(', '),
            status: initialValues.status || 'open',
        } : EMPTY_FORM);
    }, [initialValues, reset]);

    const submit = async (values) => {
        await onSubmit({
            company: values.company,
            role: values.role,
            date: values.date,
            minCgpa: Number(values.minCgpa),
            maxBacklogs: values.maxBacklogs === '' ? null : Number(values.maxBacklogs),
            branches: values.branchesText,
            status: values.status,
        });
    };

    return (
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="drive-company" className="mb-2 block font-body text-sm font-medium text-ink">Company</label>
                    <input id="drive-company" type="text" maxLength={120} {...register('company')} className="input-base" aria-invalid={!!errors.company} />
                    {errors.company && <p className="mt-1 font-mono text-xs text-signal">{errors.company.message}</p>}
                </div>
                <div>
                    <label htmlFor="drive-role" className="mb-2 block font-body text-sm font-medium text-ink">Role</label>
                    <input id="drive-role" type="text" maxLength={120} {...register('role')} className="input-base" aria-invalid={!!errors.role} />
                    {errors.role && <p className="mt-1 font-mono text-xs text-signal">{errors.role.message}</p>}
                </div>
                <div>
                    <label htmlFor="drive-date" className="mb-2 block font-body text-sm font-medium text-ink">Date</label>
                    <input id="drive-date" type="date" {...register('date')} className="input-base min-w-0" aria-invalid={!!errors.date} />
                    {errors.date && <p className="mt-1 font-mono text-xs text-signal">{errors.date.message}</p>}
                </div>
                <div>
                    <label htmlFor="drive-min-cgpa" className="mb-2 block font-body text-sm font-medium text-ink">Minimum CGPA</label>
                    <input id="drive-min-cgpa" type="number" min="0" max="10" step="0.1" {...register('minCgpa')} className="input-base" aria-invalid={!!errors.minCgpa} />
                    {errors.minCgpa && <p className="mt-1 font-mono text-xs text-signal">{errors.minCgpa.message}</p>}
                </div>
                <div>
                    <label htmlFor="drive-max-backlogs" className="mb-2 block font-body text-sm font-medium text-ink">Maximum backlogs</label>
                    <input id="drive-max-backlogs" type="number" min="0" max="20" step="1" {...register('maxBacklogs')} className="input-base" aria-invalid={!!errors.maxBacklogs} />
                    {errors.maxBacklogs && <p className="mt-1 font-mono text-xs text-signal">{errors.maxBacklogs.message}</p>}
                </div>
                <div>
                    <label htmlFor="drive-status" className="mb-2 block font-body text-sm font-medium text-ink">Status</label>
                    <select id="drive-status" {...register('status')} className="input-base">
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
            </div>
            <div>
                <label htmlFor="drive-branches" className="mb-2 block font-body text-sm font-medium text-ink">Branches</label>
                <input id="drive-branches" type="text" {...register('branchesText')} className="input-base" placeholder="CSE, ECE, IT" aria-invalid={!!errors.branchesText} />
                <p className="mt-1 font-mono text-[10px] text-ink-faint">Comma-separated; leave empty for all branches.</p>
                {errors.branchesText && <p className="mt-1 font-mono text-xs text-signal">{errors.branchesText.message}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
                    {isSubmitting ? 'Saving…' : initialValues ? 'Save changes' : 'Create drive'}
                </button>
                {onCancel && <button type="button" onClick={onCancel} className="btn-secondary w-full sm:w-auto">Cancel</button>}
            </div>
        </form>
    );
}
