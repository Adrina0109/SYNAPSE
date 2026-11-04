import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import TaskForm from '../components/tasks/TaskForm.jsx';
import TaskItem from '../components/tasks/TaskItem.jsx';
import { labelizeTaskValue } from '../components/tasks/taskHelpers.js';

const CATEGORIES = ['assessment', 'assignment', 'placement', 'event', 'personal'];
const STATUSES = [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
];

export default function Tasks() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [tasks, setTasks] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [feedback, setFeedback] = useState(location.state?.successMessage || '');
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
        if (location.state?.successMessage) {
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate]);

    const completedCount = useMemo(
        () => tasks.filter((task) => task.status === 'completed').length,
        [tasks]
    );

    const saveTask = async (payload) => {
        setIsSaving(true);
        setActionError('');
        setFeedback('');
        try {
            if (editingTask) {
                await api.patch(`/tasks/${editingTask._id}`, payload);
                setFeedback('Task updated successfully.');
            } else {
                await api.post('/tasks', payload);
                setFeedback('Task added successfully.');
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-paper">
            <nav className="border-b border-ink/10 px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to="/student" className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</Link>
                    <span className="font-mono text-xs text-ink-faint border-l border-ink/15 pl-3">Tasks</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <Link to="/student" className="btn-ghost text-sm">Dashboard</Link>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
                <header className="mb-8">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Your work</p>
                    <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink">Tasks</h1>
                    <p className="font-body text-ink-muted mt-2">
                        Keep track of what’s next. {completedCount} of {tasks.length} shown complete.
                    </p>
                </header>

                {feedback && (
                    <div className="mb-6 px-4 py-3 bg-forest/10 border border-forest/30 text-forest font-body text-sm" role="status">
                        {feedback}
                    </div>
                )}
                {actionError && (
                    <div className="mb-6 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert">
                        {actionError}
                    </div>
                )}

                <section className="card-hard p-4 sm:p-6 mb-8" aria-labelledby="task-form-heading">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div>
                            <p className="section-label mb-1">{editingTask ? 'Update your list' : 'Make a plan'}</p>
                            <h2 id="task-form-heading" className="font-display text-xl font-semibold text-ink">
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
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
                        <div>
                            <p className="section-label mb-1">Stay on top of it</p>
                            <h2 id="task-list-heading" className="font-display text-2xl font-semibold text-ink">Your tasks</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                            <label className="sr-only" htmlFor="statusFilter">Filter by status</label>
                            <select id="statusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input-base px-2 sm:px-4">
                                {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                            </select>
                            <label className="sr-only" htmlFor="categoryFilter">Filter by category</label>
                            <select id="categoryFilter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="input-base px-2 sm:px-4">
                                <option value="">All categories</option>
                                {CATEGORIES.map((category) => <option key={category} value={category}>{labelizeTaskValue(category)}</option>)}
                            </select>
                        </div>
                    </div>

                    {loadError && (
                        <div className="card-hard p-5 text-center" role="alert">
                            <p className="font-body text-sm text-signal mb-3">{loadError}</p>
                            <button type="button" onClick={loadTasks} className="btn-secondary text-sm">Try again</button>
                        </div>
                    )}
                    {!loadError && isLoading && (
                        <div className="card-hard p-8 flex items-center justify-center gap-3" role="status">
                            <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                            <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading tasks</span>
                        </div>
                    )}
                    {!loadError && !isLoading && tasks.length === 0 && (
                        <div className="card-hard p-8 text-center">
                            <p className="font-display text-lg font-semibold text-ink mb-1">No tasks here yet</p>
                            <p className="font-body text-sm text-ink-muted">Add a task above or adjust your filters.</p>
                        </div>
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
            </main>
        </div>
    );
}
