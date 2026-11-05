import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';

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
        <div className="min-w-0">
            <PageHeader title="AI Inbox" subtitle="Turn emails or WhatsApp texts into actionable tasks." />

            {feedback && <p className="mb-5 rounded-xl border border-mint/25 bg-mint/10 px-4 py-3 font-body text-sm text-mint" role="status">{feedback}</p>}
            {error && (
                <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 font-body text-sm text-danger" role="alert">
                    {error}
                    {!loading && <button type="button" onClick={loadInbox} className="btn-secondary ml-3 px-3 py-1.5 text-xs">Try again</button>}
                </div>
            )}

            {loading ? (
                <div className="space-y-4" role="status" aria-label="Loading your inbox">
                    <Skeleton className="h-56 w-full" />
                    <Skeleton className="h-56 w-full" />
                </div>
            ) : announcements.length === 0 ? (
                <EmptyState title="Your inbox is clear" body="New announcements will appear here." />
            ) : (
                <section className="space-y-4" aria-label="Announcements to review">
                    {announcements.map((announcement) => {
                        const tasks = extractedTasks[announcement.announcementId];
                        const isBusy = busyId === announcement.announcementId;
                        return (
                            <Card
                                key={announcement.receiptId}
                                className="overflow-hidden"
                                header={(
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="tag-pill-outline">{announcement.sourceType.replaceAll('_', ' ')}</span>
                                        <time className="ml-auto font-mono text-xs text-text-faint">{formatDate(announcement.createdAt)}</time>
                                    </div>
                                )}
                            >
                                <article className="grid min-w-0 gap-5 p-4 sm:p-5 lg:grid-cols-2">
                                    <div className="flex min-w-0 flex-col">
                                        <p className="section-label mb-2">Announcement</p>
                                        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-text">
                                            {announcement.rawText}
                                        </p>
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {!Array.isArray(tasks) && (
                                                <button
                                                    type="button"
                                                    onClick={() => extractTasks(announcement)}
                                                    disabled={isBusy}
                                                    className="btn-primary"
                                                >
                                                    {isBusy ? 'Extracting...' : 'Extract tasks'}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => dismissAnnouncement(announcement.announcementId)}
                                                disabled={isBusy}
                                                className="btn-secondary"
                                            >
                                                {isBusy ? 'Please wait...' : 'Dismiss'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="min-w-0 rounded-xl border border-border bg-surface-2/60 p-4 sm:p-5">
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="section-label mb-1">Review before adding</p>
                                                <h2 className="font-display text-lg font-semibold text-text">
                                                    Extracted tasks{Array.isArray(tasks) ? ` (${tasks.length})` : ''}
                                                </h2>
                                            </div>
                                            {Array.isArray(tasks) && tasks.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => confirmTasks(announcement.announcementId)}
                                                    disabled={isBusy}
                                                    className="btn-primary px-4 py-2 text-sm"
                                                >
                                                    {isBusy ? 'Adding...' : 'Add extracted tasks'}
                                                </button>
                                            )}
                                        </div>
                                        {!Array.isArray(tasks) ? (
                                            <p className="font-body text-sm leading-relaxed text-text-muted">
                                                Extract actionable tasks from this announcement to review them here.
                                            </p>
                                        ) : tasks.length === 0 ? (
                                            <p className="font-body text-sm leading-relaxed text-text-muted">
                                                No actionable tasks were found. You can dismiss this announcement.
                                            </p>
                                        ) : (
                                            <ul className="space-y-3">
                                                {tasks.map((task, index) => (
                                                    <li key={`${announcement.announcementId}-${index}`} className="min-w-0 rounded-lg border border-border bg-surface p-3">
                                                        <p className="break-words font-body text-sm font-semibold text-text">{task.title}</p>
                                                        {task.description && <p className="mt-1 break-words font-body text-sm text-text-muted">{task.description}</p>}
                                                        <p className="mt-2 font-mono text-xs leading-relaxed text-text-faint">
                                                            {task.deadline ? `Due ${formatDate(task.deadline)}` : 'No deadline'}
                                                            {' · '}{task.estimatedHours}h · {task.priority}
                                                        </p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </article>
                            </Card>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
