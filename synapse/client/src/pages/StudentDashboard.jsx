import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ScoreGauge from '../components/placement/ScoreGauge.jsx';
import TaskForm from '../components/tasks/TaskForm.jsx';
import TaskItem from '../components/tasks/TaskItem.jsx';
import { sortTasksByDeadline } from '../components/tasks/taskHelpers.js';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';

const Loading = ({ label }) => (
    <div className="flex items-center gap-3 py-6" role="status">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
        <span className="font-mono text-xs uppercase tracking-widest text-ink-faint">{label}</span>
    </div>
);

const Empty = ({ children }) => (
    <p className="py-4 font-body text-sm text-ink-muted">{children}</p>
);

const DashboardSection = ({ title, children, className = '' }) => (
    <section className={`card-hard min-w-0 p-4 sm:p-5 ${className}`}>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">{title}</h2>
        {children}
    </section>
);

const prettyDate = (value) => {
    if (!value) return 'No deadline';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Deadline unavailable';
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};

export default function StudentDashboard() {
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState('');
    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [tasksError, setTasksError] = useState('');
    const [taskActionError, setTaskActionError] = useState('');
    const [taskFeedback, setTaskFeedback] = useState('');
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [isSavingTask, setIsSavingTask] = useState(false);

    const loadDashboard = useCallback(async () => {
        setDashboardLoading(true);
        setDashboardError('');
        try {
            const { data } = await api.get('/dashboard/student');
            setDashboard(data);
        } catch (error) {
            setDashboardError(error.response?.data?.message || 'Could not load your dashboard. Please try again.');
        } finally {
            setDashboardLoading(false);
        }
    }, []);

    const loadTasks = useCallback(async () => {
        setTasksLoading(true);
        setTasksError('');
        try {
            const { data } = await api.get('/tasks');
            setTasks(data.tasks || []);
        } catch (error) {
            setTasksError(error.response?.data?.message || 'Could not load your tasks. Please try again.');
        } finally {
            setTasksLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
        loadTasks();
    }, [loadDashboard, loadTasks]);

    const pendingTasks = useMemo(
        () => sortTasksByDeadline(tasks.filter((task) => task.status !== 'completed')),
        [tasks]
    );
    const taskSummary = useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        return {
            overdue: pendingTasks.filter((task) => task.deadline && new Date(task.deadline) < now).length,
            dueSoon: pendingTasks.filter((task) => {
                if (!task.deadline) return false;
                const deadline = new Date(task.deadline).getTime();
                return deadline >= now.getTime() && deadline <= now.getTime() + 3 * 86400000;
            }).length,
            completedThisWeek: tasks.filter((task) => (
                task.status === 'completed'
                && task.completedAt
                && new Date(task.completedAt) >= weekStart
                && new Date(task.completedAt) <= now
            )).length,
        };
    }, [pendingTasks, tasks]);

    const saveTask = async (payload) => {
        setIsSavingTask(true);
        setTaskActionError('');
        setTaskFeedback('');
        try {
            if (editingTask) {
                await api.patch(`/tasks/${editingTask._id}`, payload);
                setTaskFeedback('Task updated successfully.');
            } else {
                await api.post('/tasks', payload);
                setTaskFeedback('Task added successfully.');
            }
            setShowTaskForm(false);
            setEditingTask(null);
            await loadTasks();
            await loadDashboard();
        } catch (error) {
            setTaskActionError(error.response?.data?.message || 'Could not save this task. Please try again.');
        } finally {
            setIsSavingTask(false);
        }
    };

    const toggleTask = async (task) => {
        setTaskActionError('');
        setTaskFeedback('');
        try {
            const { data } = await api.patch(`/tasks/${task._id}/toggle`);
            setTasks((current) => current.map((item) => item._id === task._id ? data.task : item));
            setTaskFeedback(data.task.status === 'completed' ? 'Task completed.' : 'Task marked pending.');
            await loadDashboard();
        } catch (error) {
            setTaskActionError(error.response?.data?.message || 'Could not update task status. Please try again.');
        }
    };

    const deleteTask = async (task) => {
        setTaskActionError('');
        setTaskFeedback('');
        try {
            await api.delete(`/tasks/${task._id}`);
            setTasks((current) => current.filter((item) => item._id !== task._id));
            setTaskFeedback('Task deleted successfully.');
            await loadDashboard();
            return true;
        } catch (error) {
            setTaskActionError(error.response?.data?.message || 'Could not delete task. Please try again.');
            return false;
        }
    };

    const startEditing = (task) => {
        setEditingTask(task);
        setShowTaskForm(true);
        setTaskActionError('');
        setTaskFeedback('');
    };

    const activeRoadmaps = Array.isArray(dashboard?.activeRoadmaps)
        ? dashboard.activeRoadmaps
        : null;
    const readinessScore = dashboard?.readinessScore ?? dashboard?.readiness?.score;
    const digestLines = Array.isArray(dashboard?.digest)
        ? dashboard.digest
        : dashboard?.digest?.lines;

    return (
        <div className="min-h-screen bg-paper">
            <div className="mx-auto w-full max-w-6xl">
                <header className="mb-6 sm:mb-8">
                    <p className="section-label mb-2 text-signal">Student dashboard</p>
                    <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                        Welcome, {user?.name?.split(' ')[0] || 'back'}.
                    </h1>
                    <p className="mt-2 font-body text-sm text-ink-muted">
                        {user?.department || 'Your learning plan'}{user?.year ? ` · Year ${user.year}` : ''}
                    </p>
                </header>

                {dashboardError && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-signal/30 bg-signal/10 px-4 py-3" role="alert">
                        <p className="font-body text-sm text-signal">{dashboardError}</p>
                        <button type="button" onClick={loadDashboard} className="btn-secondary px-4 py-2 text-sm">Retry</button>
                    </div>
                )}

                {dashboardLoading ? (
                    <div className="card-hard mb-6 p-5"><Loading label="Loading your priorities" /></div>
                ) : dashboard && Array.isArray(digestLines) && digestLines.length > 0 ? (
                    <section className="card-hard mb-6 border-l-4 border-l-signal p-4 sm:p-6" aria-labelledby="digest-heading">
                        <p className="section-label mb-1 text-signal">Your daily digest</p>
                        <h2 id="digest-heading" className="mb-3 font-display text-xl font-semibold text-ink sm:text-2xl">What matters today</h2>
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {digestLines.map((line, index) => (
                                <li key={`${index}-${line}`} className="flex gap-2 font-body text-sm leading-relaxed text-ink-muted">
                                    <span className="text-signal" aria-hidden="true">→</span>
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                <div className="mb-6 grid min-w-0 gap-4 md:grid-cols-2">
                    {dashboard && Array.isArray(dashboard.todayTasks) && (
                        <DashboardSection title="Today's tasks">
                            {dashboard.todayTasks.length === 0
                                ? <Empty>No tasks due today.</Empty>
                                : (
                                    <ul className="space-y-3">
                                        {dashboard.todayTasks.map((task) => (
                                            <li key={task._id} className="flex min-w-0 items-start justify-between gap-3 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                                                <div className="min-w-0">
                                                    <p className="break-words font-body text-sm font-medium text-ink">{task.title}</p>
                                                    <p className="mt-1 font-mono text-xs text-ink-faint">{task.status.replaceAll('_', ' ')}</p>
                                                </div>
                                                <span className="shrink-0 font-mono text-xs text-ink-faint">{prettyDate(task.deadline)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </DashboardSection>
                    )}

                    {dashboard && Array.isArray(dashboard.nextDeadlines) && (
                        <DashboardSection title="Upcoming deadlines">
                            {dashboard.nextDeadlines.length === 0
                                ? <Empty>No upcoming deadlines.</Empty>
                                : (
                                    <ul className="space-y-3">
                                        {dashboard.nextDeadlines.map((task) => (
                                            <li key={task._id} className="flex min-w-0 items-start justify-between gap-3 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                                                <p className="min-w-0 break-words font-body text-sm font-medium text-ink">{task.title}</p>
                                                <time className="shrink-0 text-right font-mono text-xs text-ink-faint" dateTime={task.deadline}>
                                                    {prettyDate(task.deadline)}
                                                </time>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </DashboardSection>
                    )}
                </div>

                <div className="mb-6 grid min-w-0 gap-4 lg:grid-cols-3">
                    {activeRoadmaps !== null && (
                        <DashboardSection title="Roadmap progress" className="lg:col-span-2">
                            {activeRoadmaps.length === 0
                                ? <Empty>No active roadmaps yet. Create one to start tracking progress.</Empty>
                                : (
                                    <div className="space-y-4">
                                        {activeRoadmaps.map((roadmap) => {
                                            const progress = roadmap.progress;
                                            const percent = progress?.completionPercent ?? 0;
                                            return (
                                                <article key={roadmap._id}>
                                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                        <h3 className="min-w-0 break-words font-body text-sm font-medium text-ink">{roadmap.goal}</h3>
                                                        <span className="tag-pill-outline shrink-0">{progress?.currentStreak ?? 0} day streak</span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden bg-ink/10" role="progressbar" aria-label={`${roadmap.goal} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                                                        <div className="h-full bg-forest" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
                                                    </div>
                                                    <p className="mt-1 font-mono text-xs text-ink-faint">{percent}% · {progress?.completedDays ?? 0} of {progress?.totalDays ?? 0} days</p>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            <Link to="/roadmaps" className="mt-4 inline-flex font-body text-sm font-medium text-signal hover:underline">View roadmaps →</Link>
                        </DashboardSection>
                    )}

                    {dashboard?.readiness && Number.isFinite(Number(readinessScore)) && (
                        <DashboardSection title="Placement readiness">
                            <ScoreGauge score={readinessScore} />
                            <p className="text-center font-body text-sm text-ink-muted">Your current readiness score</p>
                            <Link to="/placement" className="mt-3 block text-center font-body text-sm font-medium text-signal hover:underline">Explore placement prep →</Link>
                        </DashboardSection>
                    )}
                </div>

                {Array.isArray(dashboard?.conflicts) && dashboard.conflicts.length > 0 && (
                    <section className="card-hard mb-6 border-l-4 border-l-signal p-4 sm:p-5" role="status">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="section-label mb-1 text-signal">Planner warning</p>
                                <h2 className="font-display text-lg font-semibold text-ink">Your schedule needs attention</h2>
                                <ul className="mt-2 space-y-1">
                                    {dashboard.conflicts.slice(0, 3).map((conflict, index) => (
                                        <li key={conflict.id ?? index} className="font-body text-sm text-ink-muted">{conflict.message}</li>
                                    ))}
                                </ul>
                            </div>
                            <Link to="/planner" className="btn-secondary shrink-0 px-4 py-2 text-sm">Open planner</Link>
                        </div>
                    </section>
                )}

                {dashboard && Array.isArray(dashboard.mentors) && (
                    <p className="mb-6 font-body text-sm text-ink-muted">
                        <span className="font-semibold text-ink">Your mentors:</span>{' '}
                        {dashboard.mentors.length
                            ? dashboard.mentors.map((mentor) => mentor.name).filter(Boolean).join(', ')
                            : 'No mentors assigned yet.'}
                    </p>
                )}

                <section className="mb-8" aria-labelledby="quick-links-heading">
                    <h2 id="quick-links-heading" className="mb-3 font-display text-lg font-semibold text-ink">Quick links</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {[
                            ['Assistant', '/assistant'],
                            ['Announcements', '/announcements/inbox'],
                            ['Planner', '/planner'],
                            ['Roadmaps', '/roadmaps'],
                            ['Placement', '/placement'],
                        ].map(([label, to]) => (
                            <Link key={to} to={to} className="card-hard p-3 text-center font-body text-sm font-medium text-ink transition-colors hover:border-signal hover:text-signal sm:p-4">
                                {label} →
                            </Link>
                        ))}
                    </div>
                </section>

                <section aria-labelledby="my-tasks-heading">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="section-label mb-1">Your work</p>
                            <h2 id="my-tasks-heading" className="font-display text-2xl font-semibold text-ink">My Tasks</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link to="/tasks" className="btn-ghost text-sm">View all →</Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingTask(null);
                                    setShowTaskForm((visible) => !visible);
                                    setTaskActionError('');
                                    setTaskFeedback('');
                                }}
                                className="btn-primary px-4 py-2 text-sm"
                            >
                                {showTaskForm && !editingTask ? 'Close' : 'Add task'}
                            </button>
                        </div>
                    </div>
                    <p className="mb-4 font-mono text-xs text-ink-faint" aria-live="polite">
                        {taskSummary.overdue} overdue · {taskSummary.dueSoon} due within 3 days · {taskSummary.completedThisWeek} completed this week
                    </p>
                    {taskFeedback && <p className="mb-4 border border-forest/30 bg-forest/10 px-4 py-3 font-body text-sm text-forest" role="status">{taskFeedback}</p>}
                    {taskActionError && <p className="mb-4 border border-signal/30 bg-signal/10 px-4 py-3 font-body text-sm text-signal" role="alert">{taskActionError}</p>}
                    {showTaskForm && (
                        <div className="card-hard mb-4 p-4 sm:p-6">
                            <h3 className="mb-4 font-display text-lg font-semibold text-ink">{editingTask ? 'Edit task' : 'Add a task'}</h3>
                            <TaskForm
                                task={editingTask}
                                onSubmit={saveTask}
                                onCancel={() => {
                                    setShowTaskForm(false);
                                    setEditingTask(null);
                                }}
                                isSaving={isSavingTask}
                            />
                        </div>
                    )}
                    {tasksLoading ? (
                        <div className="card-hard p-5"><Loading label="Loading tasks" /></div>
                    ) : tasksError ? (
                        <div className="card-hard p-5 text-center" role="alert">
                            <p className="mb-3 font-body text-sm text-signal">{tasksError}</p>
                            <button type="button" onClick={loadTasks} className="btn-secondary px-4 py-2 text-sm">Try again</button>
                        </div>
                    ) : pendingTasks.length === 0 ? (
                        <div className="card-hard p-5 text-center"><Empty>No pending tasks. Add one to get started.</Empty></div>
                    ) : (
                        <div className="space-y-3">
                            {pendingTasks.slice(0, 6).map((task) => (
                                <TaskItem key={task._id} task={task} onToggle={toggleTask} onEdit={startEditing} onDelete={deleteTask} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
