import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import TaskForm from '../components/tasks/TaskForm.jsx';
import TaskItem from '../components/tasks/TaskItem.jsx';
import { sortTasksByDeadline } from '../components/tasks/taskHelpers.js';

const StatCard = ({ num, label }) => (
    <div className="card-hard p-6">
        <div className="font-display text-5xl font-bold text-ink mb-1">{num}</div>
        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase">{label}</div>
    </div>
);

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [tasksError, setTasksError] = useState('');
    const [taskActionError, setTaskActionError] = useState('');
    const [taskFeedback, setTaskFeedback] = useState('');
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [isSavingTask, setIsSavingTask] = useState(false);

    const loadTasks = useCallback(async () => {
        setTasksLoading(true);
        setTasksError('');
        try {
            const { data } = await api.get('/tasks');
            setTasks(data.tasks || []);
        } catch (error) {
            setTasksError(error.response?.data?.message || 'Could not load tasks. Please try again.');
        } finally {
            setTasksLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const pendingTasks = useMemo(
        () => sortTasksByDeadline(tasks.filter((task) => task.status !== 'completed')),
        [tasks]
    );
    const urgentTasks = pendingTasks.slice(0, 6);
    const taskSummary = useMemo(() => {
        const now = new Date();
        const threeDaysFromNow = now.getTime() + 3 * 24 * 60 * 60 * 1000;
        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

        return {
            overdue: pendingTasks.filter((task) => task.deadline && new Date(task.deadline) < now).length,
            dueSoon: pendingTasks.filter((task) => {
                if (!task.deadline) return false;
                const deadline = new Date(task.deadline).getTime();
                return deadline >= now.getTime() && deadline <= threeDaysFromNow;
            }).length,
            completedThisWeek: tasks.filter((task) =>
                task.status === 'completed'
                && task.completedAt
                && new Date(task.completedAt) >= startOfWeek
                && new Date(task.completedAt) <= now
            ).length,
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
            return true;
        } catch (error) {
            setTaskActionError(error.response?.data?.message || 'Could not delete this task. Please try again.');
            return false;
        }
    };

    const editTask = (task) => {
        setEditingTask(task);
        setShowTaskForm(true);
        setTaskActionError('');
        setTaskFeedback('');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-paper">
            {/* Nav */}
            <nav className="border-b border-ink/10 px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <SignalLogo />
                    <span className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</span>
                    <span className="hidden sm:block font-mono text-xs text-ink-faint border-l border-ink/15 pl-3 ml-1">Student</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                    <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <button onClick={() => navigate('/tasks')} className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2">My tasks</button>
                    <Link to="/announcements" className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2">Announcements</Link>
                    <Link to="/assistant" className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2">Ask the assistant</Link>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
                {/* Welcome */}
                <div className="mb-10">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Dashboard</p>
                    <h1 className="font-display text-4xl lg:text-5xl font-bold text-ink">
                        Morning, {user?.name?.split(' ')[0]}.
                    </h1>
                    <p className="font-body text-ink-muted mt-2">
                        {user?.department} · Year {user?.year} ·{' '}
                        <span className="text-forest font-medium">{user?.careerGoal || 'path not set'}</span>
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <StatCard num="7" label="Tasks this week" />
                    <StatCard num="3" label="Completed" />
                    <StatCard num="68%" label="Roadmap progress" />
                    <StatCard num={`${user?.dailyHours || 0}h`} label="Daily target" />
                </div>

                {/* Main grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Tasks */}
                    <div className="lg:col-span-2">
                        <section aria-labelledby="my-tasks-heading">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="section-label mb-1">Plan your week</p>
                                    <h2 id="my-tasks-heading" className="font-display text-2xl font-semibold text-ink">My Tasks</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link to="/tasks" className="btn-ghost text-sm">View all tasks →</Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTask(null);
                                            setShowTaskForm((visible) => !visible);
                                            setTaskActionError('');
                                            setTaskFeedback('');
                                        }}
                                        className="btn-primary text-sm px-4 py-2"
                                    >
                                        {showTaskForm && !editingTask ? 'Close' : 'Add task'}
                                    </button>
                                </div>
                            </div>

                            <p className="font-mono text-xs leading-relaxed text-ink-faint mb-4" aria-live="polite">
                                {taskSummary.overdue} overdue · {taskSummary.dueSoon} due within 3 days · {taskSummary.completedThisWeek} completed this week
                            </p>

                            {taskFeedback && (
                                <div className="mb-4 px-4 py-3 bg-forest/10 border border-forest/30 text-forest font-body text-sm" role="status">
                                    {taskFeedback}
                                </div>
                            )}
                            {taskActionError && (
                                <div className="mb-4 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert">
                                    {taskActionError}
                                </div>
                            )}

                            {showTaskForm && (
                                <div className="card-hard p-4 sm:p-6 mb-4">
                                    <h3 className="font-display text-lg font-semibold text-ink mb-4">
                                        {editingTask ? 'Edit task' : 'Add a task'}
                                    </h3>
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

                            {tasksError && (
                                <div className="card-hard p-5 text-center" role="alert">
                                    <p className="font-body text-sm text-signal mb-3">{tasksError}</p>
                                    <button type="button" onClick={loadTasks} className="btn-secondary text-sm">Try again</button>
                                </div>
                            )}
                            {!tasksError && tasksLoading && (
                                <div className="card-hard p-8 flex items-center justify-center gap-3" role="status">
                                    <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                                    <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading tasks</span>
                                </div>
                            )}
                            {!tasksError && !tasksLoading && pendingTasks.length === 0 && (
                                <div className="card-hard p-6 text-center">
                                    <p className="font-display text-lg font-semibold text-ink">No pending tasks, add your first one</p>
                                </div>
                            )}
                            {!tasksError && !tasksLoading && urgentTasks.length > 0 && (
                                <div className="space-y-3">
                                    {urgentTasks.map((task) => (
                                        <TaskItem
                                            key={task._id}
                                            task={task}
                                            onToggle={toggleTask}
                                            onEdit={editTask}
                                            onDelete={deleteTask}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                        {/* Skills */}
                        <div className="card-hard p-5">
                            <h2 className="font-display text-base font-semibold text-ink mb-3">Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {(user?.skills || []).map((s) => (
                                    <span key={s} className="tag-pill-outline">{s}</span>
                                ))}
                            </div>
                        </div>

                        {/* Roadmap preview */}
                        <div className="card-hard p-5">
                            <h2 className="font-display text-base font-semibold text-ink mb-3">Roadmap</h2>
                            <div className="space-y-2">
                                {['Foundations', 'Data Structures', 'System Design', 'Projects', 'Placement Prep'].map((phase, i) => (
                                    <div key={phase} className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i < 2 ? 'bg-forest' : i === 2 ? 'bg-signal' : 'bg-ink/15'}`} />
                                        <span className={`font-body text-xs ${i < 2 ? 'text-forest font-medium' : i === 2 ? 'text-signal font-medium' : 'text-ink-faint'}`}>
                                            {phase}
                                        </span>
                                        {i < 2 && <span className="font-mono text-xs text-ink-faint ml-auto">Done</span>}
                                        {i === 2 && <span className="font-mono text-xs text-signal ml-auto">In progress</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="p-5 border border-signal/30 bg-signal/5">
                            <p className="font-mono text-xs text-signal uppercase tracking-widest mb-1">Coming soon</p>
                            <p className="font-body text-sm text-ink">RAG assistant, placement readiness score, and conflict detection are being built.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SignalLogo() {
    return (
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle cx="4" cy="14" r="2.5" fill="#E8401C" />
            <circle cx="14" cy="6" r="2.5" fill="#E8401C" />
            <circle cx="24" cy="14" r="2.5" fill="#E8401C" />
            <circle cx="14" cy="22" r="2.5" fill="#E8401C" />
            <line x1="4" y1="14" x2="14" y2="6" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="14" y1="6" x2="24" y2="14" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="24" y1="14" x2="14" y2="22" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="14" y1="22" x2="4" y2="14" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
        </svg>
    );
}
