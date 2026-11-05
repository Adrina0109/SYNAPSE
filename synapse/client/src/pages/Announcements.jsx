import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';

const SOURCES = [
    { value: 'official_circular', label: 'Official circular' },
    { value: 'mentor_message', label: 'Mentor message' },
    { value: 'forwarded_message', label: 'Forwarded message' },
    { value: 'other', label: 'Other' },
];
const CATEGORIES = ['assessment', 'assignment', 'placement', 'event', 'personal'];
const PRIORITIES = ['low', 'medium', 'high'];

const toLocalDateTime = (date) => {
    if (!date) return '';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const formatDate = (date) => {
    if (!date) return 'No deadline';
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
        ? 'No deadline'
        : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const sourceLabel = (sourceType) => SOURCES.find((source) => source.value === sourceType)?.label || 'Other';

const getRequestError = (error) => {
    const status = error.response?.status;
    const response = error.response?.data;
    if (status === 502) return 'The AI could not read this right now, try again';
    if (status === 429) return 'Too many requests, wait a few minutes';
    if (status === 400) {
        const details = response?.errors && Object.entries(response.errors)
            .map(([path, message]) => `${path}: ${message}`)
            .join(' · ');
        return details || response?.message || 'Please check the announcement details and try again.';
    }
    return response?.message || 'Something went wrong. Please try again.';
};

const toEditableTask = (task) => ({
    title: task.title || '',
    description: task.description || '',
    deadline: toLocalDateTime(task.deadline),
    category: CATEGORIES.includes(task.category) ? task.category : 'personal',
    priority: PRIORITIES.includes(task.priority) ? task.priority : 'medium',
    estimatedHours: Number.isFinite(task.estimatedHours) ? task.estimatedHours : 1,
});

export default function Announcements() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [rawText, setRawText] = useState('');
    const [sourceType, setSourceType] = useState('other');
    const [announcement, setAnnouncement] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [actionError, setActionError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState('');

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError('');
        try {
            const { data } = await api.get('/announcements');
            setHistory(data.announcements || []);
        } catch (error) {
            setHistoryError(error.response?.data?.message || 'Could not load announcement history.');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const handleExtract = async (event) => {
        event.preventDefault();
        if (!rawText.trim() || isExtracting) return;
        setIsExtracting(true);
        setActionError('');
        setFeedback('');
        setAnnouncement(null);
        setTasks([]);
        try {
            const { data } = await api.post('/announcements/extract', { rawText, sourceType });
            setAnnouncement(data.announcement);
            setTasks(Array.isArray(data.tasks) ? data.tasks.map(toEditableTask) : []);
            setFeedback('Announcement read. Review the tasks before adding them.');
            await loadHistory();
        } catch (error) {
            setActionError(getRequestError(error));
        } finally {
            setIsExtracting(false);
        }
    };

    const updateTask = (index, field, value) => {
        setTasks((current) => current.map((task, taskIndex) => (
            taskIndex === index ? { ...task, [field]: value } : task
        )));
    };

    const confirmTasks = async () => {
        if (!announcement?._id || tasks.length === 0 || isSaving) return;
        if (tasks.some((task) => !task.title.trim())) {
            setActionError('Each task needs a title.');
            return;
        }

        setIsSaving(true);
        setActionError('');
        setFeedback('');
        try {
            const payload = tasks.map((task) => ({
                title: task.title.trim(),
                description: task.description,
                deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
                category: task.category,
                priority: task.priority,
                estimatedHours: Number(task.estimatedHours),
            }));
            const { data } = await api.post(`/announcements/${announcement._id}/confirm`, { tasks: payload });
            await loadHistory();
            navigate('/tasks', {
                state: {
                    successMessage: `${payload.length} ${payload.length === 1 ? 'task was' : 'tasks were'} added to your tasks.`,
                    conflicts: data.conflicts ?? [],
                },
            });
        } catch (error) {
            setActionError(getRequestError(error));
        } finally {
            setIsSaving(false);
        }
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
                    <span className="font-mono text-xs text-ink-faint border-l border-ink/15 pl-3">Announcements</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden sm:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <Link to="/student" className="btn-ghost text-sm">Dashboard</Link>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
                <header className="mb-8">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Turn messages into a plan</p>
                    <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink">Announcements</h1>
                    <p className="font-body text-ink-muted mt-2">Paste a circular or message to find tasks and deadlines.</p>
                </header>

                {feedback && (
                    <div className="mb-6 px-4 py-3 bg-forest/10 border border-forest/30 text-forest font-body text-sm" role="status">
                        {feedback}
                    </div>
                )}
                {actionError && (
                    <div className="mb-6 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm break-words" role="alert">
                        {actionError}
                    </div>
                )}

                <form onSubmit={handleExtract} className="card-hard p-4 sm:p-6 mb-8 space-y-4">
                    <div>
                        <label htmlFor="announcement-text" className="block font-body text-sm font-medium text-ink mb-2">
                            Announcement text
                        </label>
                        <textarea
                            id="announcement-text"
                            value={rawText}
                            onChange={(event) => setRawText(event.target.value)}
                            maxLength={20000}
                            rows={8}
                            className="input-base resize-y"
                            placeholder="Paste an announcement, circular, or message..."
                            aria-describedby="announcement-character-count"
                        />
                        <p id="announcement-character-count" className="mt-1 text-right font-mono text-xs text-ink-faint">
                            {rawText.length.toLocaleString()} / 20,000
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                        <div>
                            <label htmlFor="announcement-source" className="block font-body text-sm font-medium text-ink mb-2">Source</label>
                            <select
                                id="announcement-source"
                                value={sourceType}
                                onChange={(event) => setSourceType(event.target.value)}
                                className="input-base"
                            >
                                {SOURCES.map((source) => (
                                    <option key={source.value} value={source.value}>{source.label}</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" disabled={!rawText.trim() || isExtracting} className="btn-primary self-end w-full sm:w-auto">
                            {isExtracting ? 'Reading your announcement...' : 'Extract tasks'}
                        </button>
                    </div>
                </form>

                {isExtracting && (
                    <div className="card-hard p-6 mb-8 flex items-center justify-center gap-3" role="status">
                        <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                        <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Reading your announcement...</span>
                    </div>
                )}

                {announcement && (
                    <section className="mb-10" aria-labelledby="extracted-tasks-heading">
                        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                            <div>
                                <p className="section-label mb-1">Review before adding</p>
                                <h2 id="extracted-tasks-heading" className="font-display text-2xl font-semibold text-ink">Extracted tasks</h2>
                            </div>
                            <span className="tag-pill-outline">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="card-hard p-6 text-center">
                                <p className="font-display text-lg font-semibold text-ink">No tasks found in this text</p>
                                <p className="font-body text-sm text-ink-muted mt-1">Try another announcement with an action or deadline.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {tasks.map((task, index) => (
                                        <article key={`${announcement._id}-${index}`} className="card-hard p-4 sm:p-5">
                                            <div className="flex items-center justify-between gap-3 mb-4">
                                                <span className="section-label">Task {index + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setTasks((current) => current.filter((_, taskIndex) => taskIndex !== index))}
                                                    className="btn-ghost text-sm text-signal"
                                                    aria-label={`Remove ${task.title || `task ${index + 1}`}`}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label htmlFor={`task-title-${index}`} className="block font-body text-sm font-medium text-ink mb-2">Title</label>
                                                    <input
                                                        id={`task-title-${index}`}
                                                        value={task.title}
                                                        onChange={(event) => updateTask(index, 'title', event.target.value)}
                                                        maxLength={200}
                                                        className="input-base"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`task-description-${index}`} className="block font-body text-sm font-medium text-ink mb-2">Description</label>
                                                    <textarea
                                                        id={`task-description-${index}`}
                                                        value={task.description}
                                                        onChange={(event) => updateTask(index, 'description', event.target.value)}
                                                        maxLength={2000}
                                                        rows={2}
                                                        className="input-base resize-y"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label htmlFor={`task-deadline-${index}`} className="block font-body text-sm font-medium text-ink mb-2">Deadline</label>
                                                        <input
                                                            id={`task-deadline-${index}`}
                                                            type="datetime-local"
                                                            value={task.deadline}
                                                            onChange={(event) => updateTask(index, 'deadline', event.target.value)}
                                                            className="input-base min-w-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor={`task-category-${index}`} className="block font-body text-sm font-medium text-ink mb-2">Category</label>
                                                        <select
                                                            id={`task-category-${index}`}
                                                            value={task.category}
                                                            onChange={(event) => updateTask(index, 'category', event.target.value)}
                                                            className="input-base"
                                                        >
                                                            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label htmlFor={`task-priority-${index}`} className="block font-body text-sm font-medium text-ink mb-2">Priority</label>
                                                        <select
                                                            id={`task-priority-${index}`}
                                                            value={task.priority}
                                                            onChange={(event) => updateTask(index, 'priority', event.target.value)}
                                                            className="input-base"
                                                        >
                                                            {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label htmlFor={`task-hours-${index}`} className="block font-body text-sm font-medium text-ink mb-2">Estimated hours</label>
                                                        <input
                                                            id={`task-hours-${index}`}
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.5"
                                                            value={task.estimatedHours}
                                                            onChange={(event) => updateTask(index, 'estimatedHours', event.target.value === '' ? '' : Number(event.target.value))}
                                                            className="input-base"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                                <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <p className="font-mono text-xs text-ink-faint">Review each task before adding it to your list.</p>
                                    <button
                                        type="button"
                                        onClick={confirmTasks}
                                        disabled={isSaving || tasks.length === 0}
                                        className="btn-primary w-full sm:w-auto"
                                    >
                                        {isSaving ? 'Adding tasks...' : 'Confirm and add to my tasks'}
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                )}

                <section aria-labelledby="announcement-history-heading">
                    <div className="mb-4">
                        <p className="section-label mb-1">Your past submissions</p>
                        <h2 id="announcement-history-heading" className="font-display text-2xl font-semibold text-ink">Announcement history</h2>
                    </div>
                    {historyError && (
                        <div className="card-hard p-5 text-center" role="alert">
                            <p className="font-body text-sm text-signal mb-3">{historyError}</p>
                            <button type="button" onClick={loadHistory} className="btn-secondary text-sm">Try again</button>
                        </div>
                    )}
                    {!historyError && historyLoading && (
                        <div className="card-hard p-6 flex items-center justify-center gap-3" role="status">
                            <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                            <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading announcements</span>
                        </div>
                    )}
                    {!historyError && !historyLoading && history.length === 0 && (
                        <div className="card-hard p-6 text-center">
                            <p className="font-body text-sm text-ink-muted">No announcements yet. Paste one above to get started.</p>
                        </div>
                    )}
                    {!historyError && !historyLoading && history.length > 0 && (
                        <div className="space-y-3">
                            {history.map((item) => (
                                <article key={item._id} className="card-hard p-4 sm:p-5">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="tag-pill-outline">{sourceLabel(item.sourceType)}</span>
                                        <span className={`tag-pill ${item.status === 'confirmed' ? 'bg-forest' : ''}`}>
                                            {item.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                                        </span>
                                        <time className="ml-auto font-mono text-xs text-ink-faint">
                                            {formatDate(item.createdAt)}
                                        </time>
                                    </div>
                                    <p className="font-body text-sm text-ink-muted whitespace-pre-wrap break-words">
                                        {item.rawText || 'No preview available.'}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
