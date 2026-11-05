import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/ui/MetricCard.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import {
    ConflictCard,
    ContinueLearningCard,
    DigestSkeleton,
    FocusInsightsCard,
    PlacementReadinessCard,
    UpcomingDeadlinesCard,
    WeekPlanCard,
} from '../components/dashboard/DashboardCards.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTaskStats } from '../context/TaskStatsContext.jsx';
import api from '../lib/api.js';
import ErrorState from '../components/ui/ErrorState.jsx';

const errorMessage = (error, fallback) => (
    error.response?.data?.message || error.message || fallback
);

const getIstDayKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Kolkata',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    return `${values.year}-${values.month}-${values.day}`;
};

const getWeekStartKey = (dayKey) => {
    const [year, month, day] = dayKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return date.toISOString().slice(0, 10);
};

const formatHours = (hours) => {
    const value = Number(hours);
    return Number.isFinite(value) ? Number(value.toFixed(2)).toString() : '0';
};

const hasNumber = (value) => (
    value !== null
    && value !== undefined
    && value !== ''
    && Number.isFinite(Number(value))
);

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

const QuickActionIcon = ({ name }) => {
    const common = {
        fill: 'none',
        stroke: 'currentColor',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 1.7,
        viewBox: '0 0 24 24',
        'aria-hidden': true,
        className: 'h-5 w-5 shrink-0',
    };

    if (name === 'task') {
        return <svg {...common}><path d="M8 5h11M8 12h11M8 19h11M4 5h.01M4 12h.01M4 19h.01" /></svg>;
    }
    if (name === 'announcement') {
        return <svg {...common}><path d="M4 14V9a2 2 0 0 1 2-2h3l8-3v15l-8-3H6a2 2 0 0 1-2-2Z" /><path d="m8 16 1.5 4H13" /></svg>;
    }
    if (name === 'assistant') {
        return <svg {...common}><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12" /><circle cx="12" cy="12" r="4" /></svg>;
    }
    if (name === 'roadmap') {
        return <svg {...common}><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18h4a3 3 0 0 0 3-3v-6a3 3 0 0 1 3-3h0" /></svg>;
    }
    return <svg {...common}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
};

const quickActions = [
    { label: 'Add task', to: '/tasks', icon: 'task' },
    { label: 'Announcements', to: '/announcements/inbox', icon: 'announcement' },
    { label: 'Ask AI', to: '/assistant', icon: 'assistant' },
    { label: 'Generate roadmap', to: '/roadmaps', icon: 'roadmap' },
    { label: 'Re-plan my week', to: '/planner', icon: 'planner', state: { autoPreview: true } },
];

const MetricLoading = ({ label }) => (
    <section className="card-hard min-w-0 p-4 sm:p-5" aria-label={`Loading ${label}`}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-9 w-20" />
        <Skeleton className="mt-3 h-4 w-32" />
    </section>
);

const MetricError = ({ label, message, onRetry }) => (
    <section className="card-hard min-w-0 p-4 sm:p-5">
        <p className="section-label">{label}</p>
        <p className="mt-3 font-body text-sm text-danger" role="alert">{message}</p>
        <button type="button" onClick={onRetry} className="btn-secondary mt-3 px-3 py-1.5 text-xs">Try again</button>
    </section>
);

export default function StudentDashboard() {
    const { user } = useAuth();
    const { refreshKey, notifyTasksChanged } = useTaskStats();
    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState('');
    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [tasksError, setTasksError] = useState('');
    const [capacity, setCapacity] = useState(null);
    const [capacityLoading, setCapacityLoading] = useState(true);
    const [capacityError, setCapacityError] = useState('');
    const [roadmaps, setRoadmaps] = useState(null);
    const [roadmapsLoading, setRoadmapsLoading] = useState(true);
    const [roadmapsError, setRoadmapsError] = useState('');
    const [roadmapDetail, setRoadmapDetail] = useState(null);
    const [roadmapDetailLoading, setRoadmapDetailLoading] = useState(false);
    const [roadmapDetailError, setRoadmapDetailError] = useState('');
    const [roadmapDetailRetry, setRoadmapDetailRetry] = useState(0);
    const [readiness, setReadiness] = useState(null);
    const [readinessLoading, setReadinessLoading] = useState(true);
    const [readinessError, setReadinessError] = useState('');
    const [conflicts, setConflicts] = useState(null);
    const [conflictsLoading, setConflictsLoading] = useState(true);
    const [conflictsError, setConflictsError] = useState('');
    const [taskActionError, setTaskActionError] = useState('');
    const [taskFeedback, setTaskFeedback] = useState('');
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const dashboardRequestId = useRef(0);
    const tasksRequestId = useRef(0);
    const hasDashboardLoaded = useRef(false);
    const hasTasksLoaded = useRef(false);
    const [togglingTaskIds, setTogglingTaskIds] = useState([]);

    const loadDashboard = useCallback(async () => {
        const requestId = ++dashboardRequestId.current;
        if (!hasDashboardLoaded.current) setDashboardLoading(true);
        setDashboardError('');
        try {
            const { data } = await api.get('/dashboard/student');
            if (requestId === dashboardRequestId.current) {
                hasDashboardLoaded.current = true;
                setDashboard(data);
            }
        } catch (error) {
            setDashboardError(errorMessage(error, 'Could not load your dashboard. Please try again.'));
            if (requestId === dashboardRequestId.current) {
                setDashboardError(error.response?.data?.message || 'Could not load your dashboard. Please try again.');
            }
        } finally {
            if (requestId === dashboardRequestId.current) setDashboardLoading(false);
        }
    }, []);

    const loadTasks = useCallback(async () => {
        const requestId = ++tasksRequestId.current;
        if (!hasTasksLoaded.current) setTasksLoading(true);
        setTasksError('');
        try {
            const { data } = await api.get('/tasks');
            if (!Array.isArray(data.tasks)) throw new Error('Task data is unavailable.');
            setTasks(data.tasks);
        } catch (error) {
            setTasksError(errorMessage(error, 'Could not load your tasks. Please try again.'));
            if (requestId === tasksRequestId.current) {
                hasTasksLoaded.current = true;
                setTasks(data.tasks || []);
            }
        } catch (error) {
            if (requestId === tasksRequestId.current) {
                setTasksError(error.response?.data?.message || 'Could not load your tasks. Please try again.');
            }
        } finally {
            if (requestId === tasksRequestId.current) setTasksLoading(false);
        }
    }, []);

    const loadCapacity = useCallback(async () => {
        setCapacityLoading(true);
        setCapacityError('');
        try {
            const { data } = await api.get('/planner/capacity', { params: { days: 7 } });
            if (!Array.isArray(data.days)) throw new Error('Planner capacity data is unavailable.');
            setCapacity(data);
        } catch (error) {
            setCapacityError(errorMessage(error, 'Could not load your planner capacity. Please try again.'));
        } finally {
            setCapacityLoading(false);
        }
    }, []);

    const loadRoadmaps = useCallback(async () => {
        setRoadmapsLoading(true);
        setRoadmapsError('');
        try {
            const { data } = await api.get('/roadmaps');
            if (!Array.isArray(data.roadmaps)) throw new Error('Roadmap data is unavailable.');
            setRoadmaps(data.roadmaps);
        } catch (error) {
            setRoadmapsError(errorMessage(error, 'Could not load your roadmaps. Please try again.'));
    useEffect(() => {
        loadDashboard();
        loadTasks();
    }, [loadDashboard, loadTasks, refreshKey]);

    useEffect(() => {
        const refreshOnFocus = () => {
            if (document.visibilityState === 'visible') {
                loadDashboard();
                loadTasks();
            }
        };
        window.addEventListener('focus', refreshOnFocus);
        return () => window.removeEventListener('focus', refreshOnFocus);
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
            overdue: dashboard?.taskStats?.overdue ?? pendingTasks.filter((task) => task.deadline && new Date(task.deadline) < now).length,
            dueSoon: dashboard?.taskStats?.dueInThreeDays ?? pendingTasks.filter((task) => {
                if (!task.deadline) return false;
                const deadline = new Date(task.deadline).getTime();
                return deadline >= now.getTime() && deadline <= now.getTime() + 3 * 86400000;
            }).length,
            completedThisWeek: dashboard?.taskStats?.completedThisWeek ?? tasks.filter((task) => (
                task.status === 'completed'
                && task.completedAt
                && new Date(task.completedAt) >= weekStart
                && new Date(task.completedAt) <= now
            )).length,
        };
    }, [dashboard?.taskStats, pendingTasks, tasks]);

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
            return true;
        } catch (error) {
            setTaskActionError(error.response?.data?.message || 'Could not save this task. Please try again.');
            return false;
        } finally {
            setRoadmapsLoading(false);
        }
    }, []);

    const loadReadiness = useCallback(async () => {
        setReadinessLoading(true);
        setReadinessError('');
        try {
            const { data } = await api.get('/placement/readiness');
            if (!data.readiness) throw new Error('Readiness data is unavailable.');
            setReadiness(data.readiness);
        } catch (error) {
            setReadinessError(errorMessage(error, 'Could not load placement readiness.'));
        } finally {
            setReadinessLoading(false);
    const toggleTask = async (task) => {
        setTaskActionError('');
        setTaskFeedback('');
        const wasCompleted = task.status === 'completed';
        const optimisticTask = {
            ...task,
            status: wasCompleted ? 'pending' : 'completed',
            completedAt: wasCompleted ? null : new Date().toISOString(),
        };
        setTasks((current) => current.map((item) => item._id === task._id ? optimisticTask : item));
        setDashboard((current) => {
            if (!current?.taskStats) return current;
            const completedDelta = wasCompleted ? -1 : 1;
            const pendingDelta = -completedDelta;
            const total = current.taskStats.total ?? 0;
            const completed = Math.max(0, (current.taskStats.completed ?? 0) + completedDelta);
            return {
                ...current,
                taskStats: {
                    ...current.taskStats,
                    completed,
                    pending: Math.max(0, (current.taskStats.pending ?? 0) + pendingDelta),
                    completionRate: total === 0 ? 0 : Math.round((completed / total) * 10000) / 100,
                },
            };
        });
        setTogglingTaskIds((current) => [...current, task._id]);
        try {
            const { data } = await api.patch(`/tasks/${task._id}/toggle`);
            setTasks((current) => current.map((item) => item._id === task._id ? data.task : item));
            if (data.taskStats) {
                setDashboard((current) => current ? { ...current, taskStats: data.taskStats } : current);
            }
            setTaskFeedback(data.task.status === 'completed' ? 'Task completed.' : 'Task marked pending.');
            return true;
        } catch (error) {
            setTasks((current) => current.map((item) => item._id === task._id ? task : item));
            setDashboard((current) => {
                if (!current?.taskStats) return current;
                const completedDelta = wasCompleted ? 1 : -1;
                const pendingDelta = -completedDelta;
                const total = current.taskStats.total ?? 0;
                const completed = Math.max(0, (current.taskStats.completed ?? 0) + completedDelta);
                return {
                    ...current,
                    taskStats: {
                        ...current.taskStats,
                        completed,
                        pending: Math.max(0, (current.taskStats.pending ?? 0) + pendingDelta),
                        completionRate: total === 0 ? 0 : Math.round((completed / total) * 10000) / 100,
                    },
                };
            });
            setTaskActionError(error.response?.data?.message || 'Could not update task status. Please try again.');
            return false;
        } finally {
            setTogglingTaskIds((current) => current.filter((id) => id !== task._id));
        }
    }, []);

    const loadConflicts = useCallback(async () => {
        setConflictsLoading(true);
        setConflictsError('');
        try {
            const { data } = await api.get('/planner/conflicts');
            if (!Array.isArray(data.conflicts)) throw new Error('Planner conflict data is unavailable.');
            setConflicts(data.conflicts);
            await api.delete(`/tasks/${task._id}`);
            setTasks((current) => current.filter((item) => item._id !== task._id));
            setTaskFeedback('Task deleted successfully.');
            return true;
        } catch (error) {
            setConflictsError(errorMessage(error, 'Could not load planner conflicts.'));
        } finally {
            setConflictsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
        loadTasks();
        loadCapacity();
        loadRoadmaps();
    }, [loadDashboard, loadCapacity, loadRoadmaps, loadTasks]);

    useEffect(() => {
        if (!dashboard || dashboardLoading) return;

        if (dashboard.readiness && typeof dashboard.readiness === 'object') {
            setReadiness(dashboard.readiness);
            setReadinessLoading(false);
        } else {
            loadReadiness();
            return undefined;
        }

        setReadinessError('');
    }, [dashboard, dashboardLoading, loadReadiness]);

    useEffect(() => {
        if (!dashboard || dashboardLoading) return;

        if (Array.isArray(dashboard.conflicts)) {
            setConflicts(dashboard.conflicts);
            setConflictsLoading(false);
            setConflictsError('');
            return undefined;
        }

        loadConflicts();
        return undefined;
    }, [dashboard, dashboardLoading, loadConflicts]);

    const activeRoadmap = useMemo(() => {
        const dashboardRoadmap = dashboard?.activeRoadmaps?.find((roadmap) => roadmap.status === 'active');
        if (dashboardRoadmap) {
            const fullRoadmap = roadmaps?.find((roadmap) => roadmap._id === dashboardRoadmap._id);
            return fullRoadmap
                ? { ...fullRoadmap, ...dashboardRoadmap, progress: dashboardRoadmap.progress ?? fullRoadmap.progress }
                : dashboardRoadmap;
        }
        return roadmaps?.find((roadmap) => roadmap.status === 'active') ?? null;
    }, [dashboard, roadmaps]);

    useEffect(() => {
        if (!activeRoadmap?._id) {
            setRoadmapDetail(null);
            setRoadmapDetailLoading(false);
            setRoadmapDetailError('');
            return undefined;
        }

        let cancelled = false;
        setRoadmapDetail(null);
        setRoadmapDetailLoading(true);
        setRoadmapDetailError('');
        api.get(`/roadmaps/${activeRoadmap._id}`)
            .then(({ data }) => {
                if (!data.roadmap || !Array.isArray(data.roadmap.days)) {
                    throw new Error('Roadmap schedule data is unavailable.');
                }
                if (!cancelled) setRoadmapDetail(data.roadmap);
            })
            .catch((error) => {
                if (!cancelled) setRoadmapDetailError(errorMessage(error, 'Could not load today’s roadmap topic.'));
            })
            .finally(() => {
                if (!cancelled) setRoadmapDetailLoading(false);
            });
        return () => { cancelled = true; };
    }, [activeRoadmap?._id, roadmapDetailRetry]);

    const now = new Date();
    const todayKey = capacity?.today || getIstDayKey(now);
    const weekStartKey = getWeekStartKey(todayKey);
    const pendingTasks = tasks.filter((task) => task.status === 'pending');
    const incompleteTasks = tasks.filter((task) => task.status !== 'completed');
    const dueSoonCount = incompleteTasks.filter((task) => {
        if (!task.deadline) return false;
        const deadline = new Date(task.deadline).getTime();
        return deadline >= now.getTime() && deadline <= now.getTime() + 72 * 60 * 60 * 1000;
    }).length;
    const taskOverdueCount = incompleteTasks.filter((task) => (
        task.deadline && new Date(task.deadline).getTime() < now.getTime()
    )).length;
    const completedThisWeek = tasks.filter((task) => {
        if (task.status !== 'completed' || !task.completedAt) return false;
        const completedKey = getIstDayKey(new Date(task.completedAt));
        return completedKey >= weekStartKey && completedKey <= todayKey;
    }).length;
    const plannedHours = capacity?.days?.slice(0, 7).reduce(
        (sum, day) => sum + (Number(day.totalHours) || 0),
        0
    ) ?? 0;
    const roadmapProgress = hasNumber(activeRoadmap?.progress?.completionPercent)
        ? Number(activeRoadmap.progress.completionPercent)
        : null;
    const readinessScore = hasNumber(dashboard?.readinessScore)
        ? dashboard.readinessScore
        : readiness?.score;
    const planProgress = roadmapProgress ?? (hasNumber(readinessScore) ? Number(readinessScore) : null);
    const digestLines = Array.isArray(dashboard?.digest)
        ? dashboard.digest
        : dashboard?.digest?.lines;

    if (dashboardLoading) {
        return (
            <div className="min-w-0">
                <PageHeader title="Your student dashboard" subtitle="Loading your priorities and progress." />
                <div className="grid gap-4 lg:grid-cols-12">
                    <div className="space-y-4 lg:col-span-8">
                        <Skeleton className="h-12 w-2/3" />
                        <DigestSkeleton />
                    </div>
                    <Skeleton className="h-64 lg:col-span-4" />
                    {Array.from({ length: 4 }, (_, index) => <MetricLoading key={index} label="dashboard metric" />)}
                    {Array.from({ length: 3 }, (_, index) => <Skeleton key={`section-${index}`} className="h-72" />)}
                </div>
            </div>
        );
    }

    if (dashboardError) {
        return (
            <div className="min-w-0">
                <PageHeader title="Your student dashboard" />
                <ErrorState message={dashboardError} onRetry={loadDashboard} />
            </div>
        );
    }

    const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
    const greeting = `${getGreeting()}, ${firstName}`;
    const readinessSubtitle = hasNumber(readinessScore)
        ? `Stay focused. You are ${Math.round(Number(readinessScore))}% on track this week.`
        : undefined;
    const digestAvailable = Array.isArray(digestLines) && digestLines.length > 0;
    const overdueCount = hasNumber(dashboard?.overdueCount)
        ? Number(dashboard.overdueCount)
        : taskOverdueCount;
    const overdueAvailable = hasNumber(dashboard?.overdueCount) || !tasksError;
    const activeRoadmapLoading = !activeRoadmap && roadmapsLoading;
    const totalPlannedHours = formatHours(plannedHours);
    const showConflictCard = Array.isArray(dashboard?.conflicts)
        ? dashboard.conflicts.length > 0
        : conflictsLoading || Boolean(conflictsError) || Boolean(conflicts?.length);

    return (
        <div className="min-w-0 space-y-6">
            <div className="grid min-w-0 gap-6 lg:grid-cols-12">
                <section className="min-w-0 space-y-5 lg:col-span-8">
                    <PageHeader title={greeting} subtitle={readinessSubtitle} />
                    {dashboardLoading ? <DigestSkeleton /> : digestAvailable ? (
                        <section className="card-hard min-w-0 overflow-hidden bg-gradient-to-br from-accent/20 via-surface to-blue/10 p-5 sm:p-6" aria-labelledby="study-companion-heading">
                            <div className="flex items-start gap-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden="true">
                                    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
                                        <path d="M9 16h14" stroke="currentColor" strokeWidth="2" />
                                        <circle cx="7" cy="16" r="4" fill="currentColor" />
                                        <circle cx="25" cy="16" r="4" fill="currentColor" />
                                    </svg>
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="section-label mb-1 text-accent">Daily digest</p>
                                    <h2 id="study-companion-heading" className="font-display text-xl font-semibold text-text sm:text-2xl">Your AI Study Companion</h2>
                                    <ul className="mt-4 space-y-2">
                                        {digestLines.slice(0, 4).map((line, index) => (
                                            <li key={`${index}-${line}`} className="flex gap-2 font-body text-sm leading-relaxed text-text-muted">
                                                <span className="mt-0.5 text-accent" aria-hidden="true">·</span>
                                                <span className="min-w-0 break-words">{line}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link to="/assistant" className="btn-primary mt-5 inline-flex px-4 py-2 text-sm">Open assistant</Link>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <ErrorState message="Your daily digest is unavailable." onRetry={loadDashboard} />
                    )}
                </section>

                <section className="card-hard min-w-0 p-4 sm:p-5 lg:col-span-4" aria-labelledby="quick-actions-heading">
                    <p className="section-label mb-1">Get moving</p>
                    <h2 id="quick-actions-heading" className="mb-3 font-display text-lg font-semibold text-text">Quick actions</h2>
                    <ul className="space-y-1">
                        {quickActions.map((action) => (
                            <li key={action.to}>
                                <Link
                                    to={action.to}
                                    state={action.state}
                                    className="group flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 font-body text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                                >
                                    <QuickActionIcon name={action.icon} />
                                    <span className="min-w-0 flex-1">{action.label}</span>
                                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                        <path d="m9 18 6-6-6-6" />
                                    </svg>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            <section className="grid min-w-0 grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Progress metrics">
                {tasksLoading ? (
                    <>
                        <MetricLoading label="pending tasks" />
                        <MetricLoading label="due soon" />
                    </>
                ) : tasksError ? (
                    <>
                        <MetricError label="Pending tasks" message={tasksError} onRetry={loadTasks} />
                        <MetricError label="Due soon" message={tasksError} onRetry={loadTasks} />
                    </>
                ) : (
                    <>
                        <MetricCard label="Pending tasks" value={pendingTasks.length} hint="Tasks awaiting completion" />
                        <MetricCard label="Due soon" value={dueSoonCount} hint="Within the next 72 hours" />
                    </>
                )}
                {dashboard?.overdueCount == null && tasksLoading ? (
                    <MetricLoading label="overdue tasks" />
                ) : !overdueAvailable ? (
                    <MetricError label="Overdue" message={tasksError} onRetry={loadTasks} />
                ) : (
                    <MetricCard
                        label="Overdue"
                        value={<span className={overdueCount > 0 ? 'text-danger' : 'text-mint'}>{overdueCount}</span>}
                        hint={overdueCount > 0 ? 'Needs attention' : 'No overdue tasks'}
                    />
                )}
                <MetricCard
                    label="Plan progress"
                    value={planProgress === null ? '—' : `${Math.round(planProgress)}%`}
                    hint={roadmapProgress !== null
                        ? `Active roadmap${activeRoadmap?.goal ? ` · ${activeRoadmap.goal}` : ''}`
                        : readinessScore != null
                            ? 'Placement readiness score'
                            : 'No active roadmap or readiness score'}
                />
            </section>

            <section className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Plan and focus">
                <WeekPlanCard
                    capacity={capacity}
                    isLoading={capacityLoading}
                    error={capacityError}
                    onRetry={loadCapacity}
                />
                <UpcomingDeadlinesCard
                    tasks={tasks}
                    isLoading={tasksLoading}
                    error={tasksError}
                    now={now}
                    onRetry={loadTasks}
                />
                <FocusInsightsCard
                    tasks={tasks}
                    tasksLoading={tasksLoading}
                    tasksError={tasksError}
                    completedThisWeek={completedThisWeek}
                    plannedHours={totalPlannedHours}
                    capacityLoading={capacityLoading}
                    capacityError={capacityError}
                    roadmapProgress={roadmapProgress}
                />
            </section>

            <section className="grid min-w-0 gap-4 lg:grid-cols-2" aria-label="Learning and placement">
                <ContinueLearningCard
                    roadmap={activeRoadmap}
                    detail={roadmapDetail}
                    isLoading={activeRoadmapLoading}
                    detailLoading={roadmapDetailLoading || Boolean(activeRoadmap && !roadmapDetail && !roadmapDetailError)}
                    today={todayKey}
                    error={roadmapDetailError || (roadmapsError && !activeRoadmap ? roadmapsError : '')}
                    onRetry={activeRoadmap
                        ? () => setRoadmapDetailRetry((value) => value + 1)
                        : loadRoadmaps}
                />
                <PlacementReadinessCard
                    readiness={readiness || (dashboard?.readinessScore != null ? { score: dashboard.readinessScore } : null)}
                    isLoading={readinessLoading}
                    error={readinessError}
                    onRetry={loadReadiness}
                />
            </section>

            {showConflictCard && (
                <ConflictCard
                    conflicts={conflicts}
                    isLoading={conflictsLoading}
                    error={conflictsError}
                    onRetry={loadConflicts}
                />
            )}
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
                        {dashboard?.taskStats?.completed ?? tasks.filter((task) => task.status === 'completed').length} completed · {dashboard?.taskStats?.pending ?? pendingTasks.length} pending · {dashboard?.taskStats?.completionRate ?? 0}% complete · {taskSummary.overdue} overdue · {taskSummary.dueSoon} due within 3 days · {taskSummary.completedThisWeek} completed this week
                    </p>
                    {taskFeedback && <p className="mb-4 border border-forest/30 bg-forest/10 px-4 py-3 font-body text-sm text-forest" role="status">{taskFeedback}</p>}
                    {taskActionError && <p className="mb-4 border border-signal/30 bg-signal/10 px-4 py-3 font-body text-sm text-signal" role="alert">{taskActionError}</p>}
                    {showTaskForm && (
                        <div className="card-hard mb-4 p-4 sm:p-6">
                            <h3 className="mb-4 font-display text-lg font-semibold text-ink">{editingTask ? 'Edit task' : 'Add a task'}</h3>
                            <TaskForm
                                task={editingTask}
                                onSubmit={saveTask}
                                onTaskChanged={notifyTasksChanged}
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
                                <TaskItem key={task._id} task={task} onToggle={toggleTask} onEdit={startEditing} onDelete={deleteTask} onTaskChanged={notifyTasksChanged} isToggling={togglingTaskIds.includes(task._id)} />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
