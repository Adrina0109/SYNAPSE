import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api.js';

const formatDate = (date) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
        ? 'Date unavailable'
        : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function AnnouncementInbox() {
    const [announcements, setAnnouncements] = useState([]);
    const [extractedTasks, setExtractedTasks] = useState({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');

    const loadInbox = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/announcements/inbox');
            setAnnouncements(data.announcements || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not load your announcement inbox.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInbox();
    }, [loadInbox]);

    const extractTasks = async (announcement) => {
        const id = announcement.announcementId;
        setBusyId(id);
        setError('');
        setFeedback('');
        try {
            const { data } = await api.post(`/announcements/${id}/extract`);
            setExtractedTasks((current) => ({ ...current, [id]: data.tasks || [] }));
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not extract tasks from this announcement.');
        } finally {
            setBusyId('');
        }
    };

    const confirmTasks = async (announcementId) => {
        const tasks = extractedTasks[announcementId] || [];
        setBusyId(announcementId);
        setError('');
        setFeedback('');
        try {
            await api.post(`/announcements/${announcementId}/confirm`, { tasks });
            setAnnouncements((current) => current.filter((item) => item.announcementId !== announcementId));
            setExtractedTasks((current) => {
                const next = { ...current };
                delete next[announcementId];
                return next;
            });
            setFeedback(`${tasks.length} ${tasks.length === 1 ? 'task was' : 'tasks were'} added to your task list.`);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not confirm these tasks.');
        } finally {
            setBusyId('');
        }
    };

    const dismissAnnouncement = async (announcementId) => {
        setBusyId(announcementId);
        setError('');
        setFeedback('');
        try {
            await api.post(`/announcements/${announcementId}/dismiss`);
            setAnnouncements((current) => current.filter((item) => item.announcementId !== announcementId));
            setFeedback('Announcement dismissed.');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not dismiss this announcement.');
        } finally {
            setBusyId('');
        }
    };

    return (
        <div className="min-h-screen bg-paper">
            <div className="mx-auto w-full max-w-5xl">
                <header className="mb-8">
                    <p className="section-label mb-2">For you</p>
                    <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Announcement inbox</h1>
                    <p className="mt-2 font-body text-ink-muted">Review announcements, extract tasks, or dismiss them.</p>
                </header>

                {feedback && <p className="mb-5 border border-forest/30 bg-forest/10 px-4 py-3 text-sm text-forest" role="status">{feedback}</p>}
                {error && <p className="mb-5 border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-signal" role="alert">{error}</p>}

                {loading ? (
                    <div className="card-hard p-6 text-center font-mono text-xs uppercase tracking-widest text-ink-faint" role="status">Loading your inbox</div>
                ) : announcements.length === 0 ? (
                    <div className="card-hard p-6 text-center font-body text-sm text-ink-muted">Your inbox is clear. New announcements will appear here.</div>
                ) : (
                    <div className="space-y-4">
                        {announcements.map((announcement) => {
                            const tasks = extractedTasks[announcement.announcementId];
                            const isBusy = busyId === announcement.announcementId;
                            return (
                                <article key={announcement.receiptId} className="card-hard p-4 sm:p-5">
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <span className="tag-pill-outline">{announcement.sourceType.replaceAll('_', ' ')}</span>
                                        <time className="ml-auto font-mono text-xs text-ink-faint">{formatDate(announcement.createdAt)}</time>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words font-body text-sm text-ink">{announcement.rawText}</p>
                                    {Array.isArray(tasks) && (
                                        <div className="mt-5 border-t border-ink/10 pt-4">
                                            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Review extracted tasks</h2>
                                            {tasks.length === 0 ? (
                                                <p className="font-body text-sm text-ink-muted">No actionable tasks were found. You can dismiss this announcement.</p>
                                            ) : (
                                                <ul className="mb-4 space-y-3">
                                                    {tasks.map((task, index) => (
                                                        <li key={`${announcement.announcementId}-${index}`} className="border border-ink/10 p-3">
                                                            <p className="font-body text-sm font-semibold text-ink">{task.title}</p>
                                                            {task.description && <p className="mt-1 font-body text-sm text-ink-muted">{task.description}</p>}
                                                            <p className="mt-2 font-mono text-xs text-ink-faint">
                                                                {task.deadline ? `Due ${formatDate(task.deadline)}` : 'No deadline'}
                                                                {' · '}{task.estimatedHours}h · {task.priority}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {tasks.length > 0 && (
                                                <button type="button" onClick={() => confirmTasks(announcement.announcementId)} disabled={isBusy} className="btn-primary">
                                                    {isBusy ? 'Saving...' : 'Confirm and add tasks'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                                        {!Array.isArray(tasks) && (
                                            <button type="button" onClick={() => extractTasks(announcement)} disabled={isBusy} className="btn-secondary text-sm">
                                                {isBusy ? 'Extracting...' : 'Extract tasks'}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => dismissAnnouncement(announcement.announcementId)} disabled={isBusy} className="btn-ghost text-sm">
                                            Dismiss
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
                {!loading && error && (
                    <div className="mt-4 text-center">
                        <button type="button" onClick={loadInbox} className="btn-secondary text-sm">Try again</button>
                    </div>
                )}
            </div>
        </div>
    );
}
