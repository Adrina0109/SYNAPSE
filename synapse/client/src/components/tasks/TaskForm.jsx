import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskFormSchema } from '../../lib/validators.js';

const CATEGORIES = ['assessment', 'assignment', 'placement', 'event', 'personal'];
const PRIORITIES = ['low', 'medium', 'high'];

const EMPTY_FORM = {
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    deadline: '',
    estimatedHours: 1,
};

const toDateTimeLocal = (date) => {
    if (!date) return '';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
};

export default function TaskForm({ task = null, onSubmit, onCancel, onTaskChanged, isSaving = false }) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(taskFormSchema),
        defaultValues: EMPTY_FORM,
        mode: 'onBlur',
    });

    useEffect(() => {
        reset(task ? {
            title: task.title,
            description: task.description || '',
            category: task.category,
            priority: task.priority,
            status: task.status,
            deadline: toDateTimeLocal(task.deadline),
            estimatedHours: task.estimatedHours ?? 1,
        } : EMPTY_FORM);
    }, [task, reset]);

    const submit = async (values) => {
        const { status, ...taskValues } = values;
        const saved = await onSubmit({
            ...taskValues,
            ...(task && status ? { status } : {}),
            deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
        });
        if (saved !== false) onTaskChanged?.();
    };

    return (
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
            <div>
                <label htmlFor="task-title" className="block font-body text-sm font-medium text-ink mb-2">Title</label>
                <input id="task-title" type="text" maxLength="200" {...register('title')} className="input-base" aria-invalid={!!errors.title} />
                {errors.title && <p className="mt-1 font-mono text-xs text-signal">{errors.title.message}</p>}
            </div>

            <div>
                <label htmlFor="task-description" className="block font-body text-sm font-medium text-ink mb-2">Description</label>
                <textarea
                    id="task-description"
                    rows="3"
                    maxLength="2000"
                    {...register('description')}
                    className="input-base resize-y"
                    aria-invalid={!!errors.description}
                />
                {errors.description && <p className="mt-1 font-mono text-xs text-signal">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {task && (
                    <div>
                        <label htmlFor="task-status" className="block font-body text-sm font-medium text-ink mb-2">Status</label>
                        <select id="task-status" {...register('status')} className="input-base">
                            <option value="pending">Pending</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                )}
                <div>
                    <label htmlFor="task-category" className="block font-body text-sm font-medium text-ink mb-2">Category</label>
                    <select id="task-category" {...register('category')} className="input-base">
                        {CATEGORIES.map((category) => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="task-priority" className="block font-body text-sm font-medium text-ink mb-2">Priority</label>
                    <select id="task-priority" {...register('priority')} className="input-base">
                        {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="task-deadline" className="block font-body text-sm font-medium text-ink mb-2">Deadline</label>
                    <input id="task-deadline" type="datetime-local" {...register('deadline')} className="input-base min-w-0" aria-invalid={!!errors.deadline} />
                    {errors.deadline && <p className="mt-1 font-mono text-xs text-signal">{errors.deadline.message}</p>}
                </div>
                <div>
                    <label htmlFor="task-estimated-hours" className="block font-body text-sm font-medium text-ink mb-2">Estimated hours</label>
                    <input
                        id="task-estimated-hours"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        {...register('estimatedHours', { setValueAs: (value) => value === '' ? undefined : Number(value) })}
                        className="input-base"
                        aria-invalid={!!errors.estimatedHours}
                    />
                    {errors.estimatedHours && <p className="mt-1 font-mono text-xs text-signal">{errors.estimatedHours.message}</p>}
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={isSaving} className="btn-primary w-full sm:w-auto">
                    {isSaving ? 'Saving…' : task ? 'Save changes' : 'Add task'}
                </button>
                {onCancel && <button type="button" onClick={onCancel} className="btn-secondary w-full sm:w-auto">Cancel</button>}
            </div>
        </form>
    );
}
