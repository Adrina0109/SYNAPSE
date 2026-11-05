import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import RecipientSelector from '../components/RecipientSelector.jsx';

const SOURCES = [
    { value: 'official_circular', label: 'Official circular' },
    { value: 'mentor_message', label: 'Mentor message' },
    { value: 'forwarded_message', label: 'Forwarded message' },
    { value: 'other', label: 'Other' },
];

const formatDate = (date) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
        ? 'Date unavailable'
        : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function Announcements() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [rawText, setRawText] = useState('');
    const [sourceType, setSourceType] = useState('other');
    const [recipients, setRecipients] = useState([]);
    const [recipientsLoading, setRecipientsLoading] = useState(true);
    const [recipientsError, setRecipientsError] = useState('');
    const [recipientMode, setRecipientMode] = useState('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [deletingId, setDeletingId] = useState('');
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');

    const loadAnnouncements = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const { data } = await api.get('/announcements/sent');
            setAnnouncements(data.announcements || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not load sent announcements.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadRecipients = useCallback(async () => {
        setRecipientsLoading(true);
        setRecipientsError('');
        try {
            const { data } = await api.get('/mentor/recipients');
            setRecipients(data.students || []);
            setSelectedStudentIds((current) => current.filter(
                (id) => (data.students || []).some((student) => student._id === id)
            ));
        } catch (requestError) {
            setRecipientsError(requestError.response?.data?.message || 'Could not load selectable students.');
        } finally {
            setRecipientsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnnouncements();
        loadRecipients();
    }, [loadAnnouncements, loadRecipients]);

    const sendAnnouncement = async (event) => {
        event.preventDefault();
        if (!rawText.trim() || isSending) return;
        if (recipientsError || recipientsLoading || recipients.length === 0) return;
        if (recipientMode === 'selected' && selectedStudentIds.length === 0) {
            setError('Select at least one student.');
            return;
        }

        setIsSending(true);
        setError('');
        setFeedback('');
        try {
            const payload = {
                rawText,
                sourceType,
                recipientMode,
                ...(recipientMode === 'selected' ? { studentIds: selectedStudentIds } : {}),
            };
            const { data } = await api.post('/announcements', payload);
            setRawText('');
            setFeedback(`Sent to ${data.announcement.recipientCount} ${data.announcement.recipientCount === 1 ? 'student' : 'students'}.`);
            await loadAnnouncements();
        } catch (requestError) {
            if (requestError.response?.status === 403) {
                setError('You can only send to students assigned to you. Refresh the student list and try again.');
            } else if (requestError.response?.status === 400) {
                setError(requestError.response?.data?.message || 'Check the selected recipients and announcement text.');
            } else {
                setError(requestError.response?.data?.message || 'Could not send this announcement.');
            }
        } finally {
            setIsSending(false);
        }
    };

    const recipientCount = recipientMode === 'all' ? recipients.length : selectedStudentIds.length;

    const deleteAnnouncement = async (announcementId) => {
        if (!window.confirm('Delete this announcement and its student inbox notifications?')) return;
        setDeletingId(announcementId);
        setError('');
        setFeedback('');
        try {
            await api.delete(`/announcements/${announcementId}`);
            setAnnouncements((current) => current.filter((item) => item._id !== announcementId));
            setFeedback('Announcement and its inbox records were deleted.');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not delete this announcement.');
        } finally {
            setDeletingId('');
        }
    };

    return (
        <div className="min-h-screen bg-paper">
            <div className="mx-auto w-full max-w-5xl">
                <PageHeader
                    title="Announcements"
                    subtitle={isAdmin
                        ? 'Send to all students or to a mentor’s assigned students.'
                        : 'Announcements are delivered only to your assigned students.'}
                />
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
                <header className="mb-8">
                    <p className="section-label mb-2">Share with students</p>
                    <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Announcements</h1>
                    <p className="mt-2 font-body text-ink-muted">
                        {isAdmin
                            ? 'Choose all students or select specific recipients.'
                            : 'Announcements are delivered only to your assigned students.'}
                    </p>
                </header>

                {feedback && <p className="mb-5 border border-forest/30 bg-forest/10 px-4 py-3 text-sm text-forest" role="status">{feedback}</p>}
                {error && <p className="mb-5 border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-signal" role="alert">{error}</p>}

                <form onSubmit={sendAnnouncement} className="card-hard mb-10 space-y-4 p-4 sm:p-6">
                    <div>
                        <label htmlFor="announcement-text" className="mb-2 block font-body text-sm font-medium text-ink">Announcement text</label>
                        <textarea
                            id="announcement-text"
                            value={rawText}
                            onChange={(event) => setRawText(event.target.value)}
                            maxLength={20000}
                            rows={7}
                            className="input-base resize-y"
                            placeholder="Write an announcement for students..."
                            required
                        />
                        <p className="mt-1 text-right font-mono text-xs text-ink-faint">{rawText.length.toLocaleString()} / 20,000</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="announcement-source" className="mb-2 block font-body text-sm font-medium text-ink">Source</label>
                            <select id="announcement-source" value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="input-base">
                                {SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
                            </select>
                        </div>
                        <RecipientSelector
                            recipients={recipients}
                            loading={recipientsLoading}
                            error={recipientsError}
                            onRetry={loadRecipients}
                            isAdmin={isAdmin}
                            recipientMode={recipientMode}
                            setRecipientMode={setRecipientMode}
                            selectedStudentIds={selectedStudentIds}
                            setSelectedStudentIds={setSelectedStudentIds}
                        />
                    </div>
                    {recipientCount > 0 && (
                        <p className="font-body text-sm text-ink-muted" role="status">
                            This will notify {recipientCount} {recipientCount === 1 ? 'student' : 'students'}.
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={!rawText.trim() || isSending || recipientsLoading || Boolean(recipientsError) || recipients.length === 0 || (recipientMode === 'selected' && selectedStudentIds.length === 0)}
                        className="btn-primary"
                    >
                        {isSending ? 'Sending...' : 'Send announcement'}
                    </button>
                </form>

                <section aria-labelledby="sent-announcements-heading">
                    <div className="mb-4">
                        <p className="section-label mb-1">History</p>
                        <h2 id="sent-announcements-heading" className="font-display text-2xl font-semibold text-ink">Sent announcements</h2>
                    </div>
                    {isLoading ? (
                        <div className="card-hard p-6 text-center font-mono text-xs uppercase tracking-widest text-ink-faint" role="status">Loading announcements</div>
                    ) : announcements.length === 0 ? (
                        <div className="card-hard p-6 text-center font-body text-sm text-ink-muted">No announcements have been sent yet.</div>
                    ) : (
                        <div className="space-y-3">
                            {announcements.map((announcement) => (
                                <article key={announcement._id} className="card-hard p-4 sm:p-5">
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <span className="tag-pill-outline">{announcement.recipientMode === 'selected' ? 'Selected students' : 'All students'}</span>
                                        <span className="tag-pill-outline">{announcement.recipientCount} recipients</span>
                                        <time className="ml-auto font-mono text-xs text-ink-faint">{formatDate(announcement.createdAt)}</time>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words font-body text-sm text-ink-muted">{announcement.rawText}</p>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => deleteAnnouncement(announcement._id)}
                                            disabled={deletingId === announcement._id}
                                            className="btn-ghost text-sm text-signal"
                                        >
                                            {deletingId === announcement._id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
