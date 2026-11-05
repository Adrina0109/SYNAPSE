import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import TaskForm from '../components/tasks/TaskForm.jsx';
import TaskItem from '../components/tasks/TaskItem.jsx';
import { labelizeTaskValue } from '../components/tasks/taskHelpers.js';
import ConflictBanner from '../components/planner/ConflictBanner.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';

const CATEGORIES = ['assessment', 'assignment', 'placement', 'event', 'personal'];
const STATUSES = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
];

export default function Tasks() {
    const navigate = useNavigate();
    const location = useLocation();
    const [tasks, setTasks] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [feedback, setFeedback] = useState(location.state?.successMessage || '');
    const [conflicts, setConflicts] = useState(location.state?.conflicts ?? []);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (categoryFilter) params.category = categoryFilter;
            const { data } = await api.get('/tasks', { params });
            setTasks(data.tasks || []);
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Could not load tasks. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, categoryFilter]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        if (location.state?.successMessage || location.state?.conflicts) {
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate]);

    const completedCount = useMemo(
        () => tasks.filter((task) => task.status === 'completed').length,
        [tasks]
    );
    const statusCounts = useMemo(() => ({
        '': tasks.length,
        pending: tasks.filter((task) => task.status === 'pending').length,
        in_progress: tasks.filter((task) => task.status === 'in_progress').length,
        completed: completedCount,
    }), [completedCount, tasks]);

    const saveTask = async (payload) => {
        setIsSaving(true);
        setActionError('');
        setFeedback('');
        try {
            if (editingTask) {
                const { data } = await api.patch(`/tasks/${editingTask._id}`, payload);
                setFeedback('Task updated successfully.');
                setConflicts(data.conflicts ?? []);
            } else {
                const { data } = await api.post('/tasks', payload);
                setFeedback('Task added successfully.');
                setConflicts(data.conflicts ?? []);
            }
            setEditingTask(null);
            await loadTasks();
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not save this task. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleTask = async (task) => {
        setActionError('');
        setFeedback('');
        try {
            const { data } = await api.patch(`/tasks/${task._id}/toggle`);
            setTasks((current) => current.map((item) => item._id === task._id
                ? data.task
                : item));
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not update task status. Please try again.');
        }
    };

    const deleteTask = async (task) => {
        setActionError('');
        setFeedback('');
        try {
            await api.delete(`/tasks/${task._id}`);
            setTasks((current) => current.filter((item) => item._id !== task._id));
            setFeedback('Task deleted successfully.');
            return true;
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not delete this task. Please try again.');
            return false;
        }
    };

    const startEditing = (task) => {
        setEditingTask(task);
        setActionError('');
        setFeedback('');
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        window.scrollTo({ top: 0, behavior });
    };

    return (
        <div className="min-w-0">
            <PageHeader
                title="Tasks"
                subtitle="Manage your academics, placements and personal work."
                actions={<a href="#task-form-heading" className="btn-primary">Add task</a>}
            />

            {feedback && (
                <div className="mb-5 rounded-xl border border-mint/25 bg-mint/10 px-4 py-3 font-body text-sm text-mint" role="status">
                    {feedback}
                </div>
            )}
            {actionError && (
                <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 font-body text-sm text-danger" role="alert">
                    {actionError}
                </div>
            )}

            <section id="task-form-heading" className="card-hard mb-7 p-4 sm:p-6" aria-labelledby="task-form-title">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="section-label mb-1">{editingTask ? 'Update your list' : 'Make a plan'}</p>
                            <h2 id="task-form-title" className="font-display text-xl font-semibold text-text">
                                {editingTask ? 'Edit task' : 'Add a task'}
                            </h2>
                        </div>
                        {editingTask && (
                            <button type="button" onClick={() => setEditingTask(null)} className="btn-ghost text-sm">Cancel edit</button>
                        )}
                    </div>
                    <TaskForm task={editingTask} onSubmit={saveTask} isSaving={isSaving} />
            </section>

            <section aria-labelledby="task-list-heading">
                    <div className="mb-4 flex flex-col gap-4">
                        <div>
                            <p className="section-label mb-1">Your workload</p>
                            <h2 id="task-list-heading" className="font-display text-2xl font-semibold text-text">Your tasks</h2>
                        </div>
                        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-2 p-1 sm:grid-cols-4" role="group" aria-label="Filter tasks by status">
                                {STATUSES.map((status) => (
                                    <button
                                        key={status.value || 'all'}
                                        type="button"
                                        aria-pressed={statusFilter === status.value}
                                        onClick={() => setStatusFilter(status.value)}
                                        className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2 font-body text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                                            statusFilter === status.value
                                                ? 'bg-surface text-text shadow-sm'
                                                : 'text-text-muted hover:text-text'
                                        }`}
                                    >
                                        <span>{status.label}</span>
                                        <span className="font-mono text-xs text-text-faint">{statusCounts[status.value]}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="grid min-w-0 grid-cols-2 gap-2 lg:w-[min(100%,26rem)]">
                                <label className="sr-only" htmlFor="categoryFilter">Filter by category</label>
                                <select id="categoryFilter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="input-base min-w-0 px-3 py-2.5">
                                    <option value="">All categories</option>
                                    {CATEGORIES.map((category) => <option key={category} value={category}>{labelizeTaskValue(category)}</option>)}
                                </select>
                                <div className="input-base flex min-w-0 items-center gap-2 px-3 py-2.5" aria-label="Task sort order">
                                    <span className="shrink-0 text-text-faint">Sort</span>
                                    <span className="truncate text-text">Deadline · soonest first</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {conflicts.length > 0 && (
                        <div className="mb-4">
                            <ConflictBanner conflicts={conflicts} onDismiss={() => setConflicts([])} />
                        </div>
                    )}

                    {loadError && <ErrorState message={loadError} onRetry={loadTasks} />}
                    {!loadError && isLoading && (
                        <div className="space-y-3" role="status" aria-label="Loading tasks">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    )}
                    {!loadError && !isLoading && tasks.length === 0 && (
                        <EmptyState
                            title={`No ${statusFilter ? labelizeTaskValue(statusFilter) : ''} tasks found`.replace(/\s+/g, ' ').trim()}
                            body={categoryFilter
                                ? `There are no ${labelizeTaskValue(categoryFilter)} tasks in this view. Try another category or status filter.`
                                : 'There are no tasks in this view. Add a task above or choose another status filter.'}
                        />
                    )}
                    {!loadError && !isLoading && tasks.length > 0 && (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <TaskItem
                                    key={task._id}
                                    task={task}
                                    onToggle={toggleTask}
                                    onEdit={startEditing}
                                    onDelete={deleteTask}
                                />
                            ))}
                        </div>
                    )}
            </section>
        </div>
    );
}
