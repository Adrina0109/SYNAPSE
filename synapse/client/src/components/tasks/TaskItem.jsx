import { useState } from 'react';
import { formatTaskDeadline, getTaskUrgencyClass, labelizeTaskValue } from './taskHelpers.js';

export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const confirmDelete = async () => {
        const deleted = await onDelete(task);
        if (deleted !== false) setConfirmingDelete(false);
    };

    return (
        <article className={`card-hard p-4 sm:p-5 ${task.status === 'completed' ? 'opacity-65' : ''}`}>
            <div className="flex items-start gap-3 sm:gap-4">
                <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => onToggle(task)}
                    aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}
                    className="mt-1 h-4 w-4 flex-shrink-0 accent-forest"
                />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className={`font-display text-lg font-semibold break-words ${task.status === 'completed' ? 'line-through text-ink-faint' : 'text-ink'}`}>
                            {task.title}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="tag-pill-outline">{labelizeTaskValue(task.category)}</span>
                            <span className="tag-pill">{task.priority} priority</span>
                        </div>
                    </div>
                    {task.description && (
                        <p className={`font-body text-sm mt-2 whitespace-pre-wrap break-words ${task.status === 'completed' ? 'text-ink-faint line-through' : 'text-ink-muted'}`}>
                            {task.description}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
                        <span className={`inline-flex border px-2 py-1 font-mono text-xs ${getTaskUrgencyClass(task.deadline)}`}>
                            {formatTaskDeadline(task.deadline)}
                        </span>
                        <span className="font-mono text-xs text-ink-faint">{task.estimatedHours}h estimated</span>
                        {task.status === 'in_progress' && <span className="font-mono text-xs text-signal uppercase">In progress</span>}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-ink/10">
                {confirmingDelete ? (
                    <>
                        <span className="self-center mr-auto font-body text-sm text-ink-muted">Delete this task?</span>
                        <button type="button" onClick={() => setConfirmingDelete(false)} className="btn-ghost text-sm">Cancel</button>
                        <button type="button" onClick={confirmDelete} className="btn-primary text-sm px-4 py-2">Confirm delete</button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => onEdit(task)} className="btn-secondary text-sm px-4 py-2">Edit</button>
                        <button type="button" onClick={() => setConfirmingDelete(true)} className="btn-ghost text-sm text-signal">Delete</button>
                    </>
                )}
            </div>
        </article>
    );
}
