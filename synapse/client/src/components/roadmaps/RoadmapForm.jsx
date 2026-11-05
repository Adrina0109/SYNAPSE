import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LEVEL_LABELS, PATH_LABELS, RESOURCE_LABELS } from './roadmapHelpers.js';

const preferredResourceTypes = ['youtube', 'docs', 'course', 'book', 'notes'];
const pathTypes = ['free_learning', 'free_certificate', 'any_certificate'];
const roadmapFormSchema = z.object({
    goal: z.string().trim().min(2, 'Enter a goal of at least 2 characters').max(200, 'Goal cannot exceed 200 characters'),
    currentLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    hoursPerDay: z.number().min(0.5, 'Choose at least 0.5 hours').max(8, 'Choose no more than 8 hours'),
    durationDays: z.number().int('Duration must be a whole number').min(3, 'Choose at least 3 days').max(60, 'Choose no more than 60 days'),
    startDate: z.string().min(1, 'Choose a start date'),
    pathType: z.enum(pathTypes),
    targetCertification: z.string().max(150, 'Certification name cannot exceed 150 characters'),
    preferredResources: z.array(z.enum(preferredResourceTypes)).min(1, 'Choose at least one resource'),
}).superRefine((values, context) => {
    if (values.pathType === 'free_learning' && values.targetCertification.trim()) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['targetCertification'],
            message: 'Choose a certificate path to use a target certification.',
        });
    }
});

const todayInputValue = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
};

const makeDefaults = (user) => ({
    goal: user?.careerGoal || '',
    currentLevel: 'beginner',
    hoursPerDay: user?.dailyHours || 2,
    durationDays: 14,
    startDate: todayInputValue(),
    pathType: 'free_learning',
    targetCertification: '',
    preferredResources: ['youtube', 'docs', 'notes'],
});

export default function RoadmapForm({ user, onSubmit, isSubmitting, initialValues }) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(roadmapFormSchema),
        defaultValues: makeDefaults(user),
        mode: 'onBlur',
    });
    const selectedPath = watch('pathType');
    const selectedResources = watch('preferredResources');
    const defaults = makeDefaults(user);

    useEffect(() => {
        reset({ ...defaults, ...initialValues });
    }, [initialValues, reset, user]);

    const submit = async (values) => {
        const payload = {
            ...values,
            hoursPerDay: Number(values.hoursPerDay),
            durationDays: Number(values.durationDays),
            preferredResources: values.preferredResources,
        };
        if (payload.pathType === 'free_learning' || !payload.targetCertification.trim()) {
            delete payload.targetCertification;
        }
        await onSubmit(payload);
    };

    const toggleResource = (resource) => {
        const next = selectedResources.includes(resource)
            ? selectedResources.filter((item) => item !== resource)
            : [...selectedResources, resource];
        setValue('preferredResources', next, { shouldValidate: true, shouldDirty: true });
    };

    return (
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
            <fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
                <div>
                    <label htmlFor="roadmap-goal" className="block font-body text-sm font-medium text-ink mb-2">What do you want to learn?</label>
                    <input id="roadmap-goal" type="text" maxLength="200" {...register('goal')} className="input-base" aria-invalid={!!errors.goal} />
                    {errors.goal && <p className="mt-1 font-mono text-xs text-signal">{errors.goal.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="roadmap-level" className="block font-body text-sm font-medium text-ink mb-2">Current level</label>
                        <select id="roadmap-level" {...register('currentLevel')} className="input-base">
                            {Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="roadmap-hours" className="block font-body text-sm font-medium text-ink mb-2">Hours per day</label>
                        <input id="roadmap-hours" type="number" min="0.5" max="8" step="0.5" {...register('hoursPerDay', { valueAsNumber: true })} className="input-base" aria-invalid={!!errors.hoursPerDay} />
                        {errors.hoursPerDay && <p className="mt-1 font-mono text-xs text-signal">{errors.hoursPerDay.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="roadmap-duration" className="block font-body text-sm font-medium text-ink mb-2">Duration in days</label>
                        <input id="roadmap-duration" type="number" min="3" max="60" step="1" {...register('durationDays', { valueAsNumber: true })} className="input-base" aria-invalid={!!errors.durationDays} />
                        {errors.durationDays && <p className="mt-1 font-mono text-xs text-signal">{errors.durationDays.message}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {[7, 14, 30, 45].map((days) => (
                                <button key={days} type="button" onClick={() => setValue('durationDays', days, { shouldValidate: true })} className="tag-pill-outline hover:border-ink">
                                    {days} days
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="roadmap-start-date" className="block font-body text-sm font-medium text-ink mb-2">Start date</label>
                        <input id="roadmap-start-date" type="date" {...register('startDate')} className="input-base min-w-0" aria-invalid={!!errors.startDate} />
                        {errors.startDate && <p className="mt-1 font-mono text-xs text-signal">{errors.startDate.message}</p>}
                    </div>
                </div>

                <fieldset>
                    <legend className="block font-body text-sm font-medium text-ink mb-2">Choose your path</legend>
                    <div className="grid grid-cols-1 gap-2">
                        {pathTypes.map((pathType) => (
                            <label key={pathType} className={`card-hard p-3 flex items-start gap-3 cursor-pointer ${selectedPath === pathType ? 'border-signal' : ''}`}>
                                <input type="radio" value={pathType} {...register('pathType')} className="mt-1 accent-signal" />
                                <span>
                                    <span className="block font-body text-sm font-medium text-ink">{PATH_LABELS[pathType]}</span>
                                    <span className="block font-body text-xs text-ink-muted mt-1">
                                        {pathType === 'free_learning' && 'Learn the skill: free notes, docs and videos'}
                                        {pathType === 'free_certificate' && 'Earn a certificate: free only'}
                                        {pathType === 'any_certificate' && 'Earn a certificate: paid is fine'}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                    {selectedPath !== 'free_learning' && (
                        <div className="mt-4">
                            <label htmlFor="target-certification" className="block font-body text-sm font-medium text-ink mb-2">
                                Target certification <span className="text-ink-faint">(optional)</span>
                            </label>
                            <input id="target-certification" type="text" maxLength="150" {...register('targetCertification')} className="input-base" aria-invalid={!!errors.targetCertification} />
                            <p className="font-body text-xs text-ink-faint mt-1">Leave empty to let SYNAPSE suggest one from its verified list.</p>
                            {errors.targetCertification && <p className="mt-1 font-mono text-xs text-signal">{errors.targetCertification.message}</p>}
                        </div>
                    )}
                </fieldset>

                <fieldset>
                    <legend className="block font-body text-sm font-medium text-ink mb-2">Preferred resources</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {preferredResourceTypes.map((resource) => (
                            <label key={resource} className="flex items-center gap-2 border border-ink/15 px-3 py-2 font-body text-sm text-ink">
                                <input
                                    type="checkbox"
                                    checked={selectedResources.includes(resource)}
                                    onChange={() => toggleResource(resource)}
                                    className="h-4 w-4 accent-forest"
                                />
                                {RESOURCE_LABELS[resource]}
                            </label>
                        ))}
                    </div>
                    {errors.preferredResources && <p className="mt-1 font-mono text-xs text-signal">{errors.preferredResources.message}</p>}
                </fieldset>

                {isSubmitting && (
                    <p className="font-mono text-xs text-ink-muted" role="status">
                        Building your plan. Longer plans can take up to a minute.
                    </p>
                )}
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
                    {isSubmitting ? 'Building plan…' : 'Build my roadmap'}
                </button>
            </fieldset>
        </form>
    );
}
