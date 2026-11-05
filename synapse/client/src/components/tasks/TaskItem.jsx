import { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { formatTaskDeadline, labelizeTaskValue } from './taskHelpers.js';

export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const isOverdue = task.status !== 'completed'
        && task.deadline
        && new Date(task.deadline).getTime() < Date.now();
    const priorityTone = {
        high: 'danger',
        medium: 'warning',
        low: 'success',
    }[task.priority] || 'neutral';

    const confirmDelete = async () => {
        const deleted = await onDelete(task);
        if (deleted !== false) setConfirmingDelete(false);
    };

    return (
        <>
            <article className={`card-hard p-4 sm:p-5 ${task.status === 'completed' ? 'opacity-65' : ''}`}>
                <div className="grid min-w-0 gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center">
                    <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => onToggle(task)}
                        aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}
                        className="h-4 w-4 shrink-0 accent-accent sm:row-span-2"
                    />
                    <div className="min-w-0">
                        <h3 className={`break-words font-display text-base font-semibold ${task.status === 'completed' ? 'line-through text-text-faint' : 'text-text'}`}>
                            {task.title}
                        </h3>
                        <p className={`mt-1 font-mono text-xs ${isOverdue ? 'text-danger' : 'text-text-muted'}`}>
                            {formatTaskDeadline(task.deadline)}{isOverdue ? ' · Overdue' : ''}
                        </p>
                        {task.description && (
                            <p className={`mt-2 break-words whitespace-pre-wrap font-body text-sm ${task.status === 'completed' ? 'text-text-faint line-through' : 'text-text-muted'}`}>
                                {task.description}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <StatusBadge tone={priorityTone} label={`${labelizeTaskValue(task.priority)} priority`} />
                        <span className="tag-pill-outline">{labelizeTaskValue(task.category)}</span>
                        {task.status === 'in_progress' && <StatusBadge tone="info" label="In progress" />}
                        <span className="font-mono text-xs text-text-faint">{task.estimatedHours}h</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 border-t border-border pt-3 sm:border-0 sm:pt-0">
                        <button
                            type="button"
                            onClick={() => onEdit(task)}
                            aria-label={`Edit ${task.title}`}
                            className="btn-ghost h-10 w-10 p-2 text-text-muted"
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" aria-hidden="true">
                                <path d="m14 5 5 5M4 20l4.5-1 10.1-10.1a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            aria-label={`Delete ${task.title}`}
                            className="btn-ghost h-10 w-10 p-2 text-danger"
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" aria-hidden="true">
                                <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </article>
            <ConfirmDialog
                open={confirmingDelete}
                title="Delete task?"
                body={`"${task.title}" will be permanently removed.`}
                confirmLabel="Delete task"
                cancelLabel="Keep task"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmingDelete(false)}
                variant="danger"
            />
        </>
    );
}
